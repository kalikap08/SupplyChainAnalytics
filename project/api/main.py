from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extras import execute_values
import psycopg2
import csv
import io
import os
import zipfile

app = FastAPI(
    title="Supply Chain Analytics API",
    description="API for Supply Chain Analytics Dashboard",
    version="1.0.0"
)

DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

# In production, set ALLOWED_ORIGINS to a comma-separated list (e.g. the
# deployed Vercel URL) so the deployed frontend can call this API.
_extra_origins = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = DEFAULT_ALLOWED_ORIGINS + [
    origin.strip() for origin in _extra_origins.split(",") if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_connection():
    return psycopg2.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=os.getenv("PGPORT", "5432"),
        database=os.getenv("PGDATABASE", "Supply_chain_db"),
        user=os.getenv("PGUSER", "postgres"),
        password=os.getenv("PGPASSWORD")
    )


@app.get("/")
def root():
    return {
        "message": "Supply Chain Analytics API is running"
    }


@app.get("/api/executive")
def executive_dashboard():

    conn = get_connection()

    try:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT *
            FROM vw_executive_dashboard;
        """)

        row = cursor.fetchone()

        if row is None:
            return {
                "message": "Executive dashboard returned no data"
            }

        columns = [
            description[0]
            for description in cursor.description
        ]

        return dict(zip(columns, row))

    finally:
        cursor.close()
        conn.close()

@app.get("/api/sales")
def sales():

    conn = get_connection()

    try:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT *
            FROM vw_sales_demand
            LIMIT 1000;
        """)

        rows = cursor.fetchall()

        columns = [
            description[0]
            for description in cursor.description
        ]

        return [
            dict(zip(columns, row))
            for row in rows
        ]

    finally:
        cursor.close()
        conn.close()


TABLE_SCHEMAS = {
    "dim_carrier": ["Carrier_ID", "Carrier_Name", "Late_Delivery_Probability", "Base_Shipping_Cost"],
    "dim_customer": ["Customer_ID", "Customer_Name", "Customer_Type", "Location_ID", "Sales_Channel", "Customer_Since"],
    "dim_date": ["Date", "Date_ID", "Year", "Quarter", "Month", "Month_Name", "Week", "Day", "Day_Name", "Is_Weekend", "Is_Month_End"],
    "dim_location": ["Location_ID", "City", "Region", "Country"],
    "dim_product": ["Product_ID", "Product_Name", "Category", "Subcategory", "Brand", "Unit_Cost", "Selling_Price", "Primary_Supplier_ID", "Product_Status"],
    "dim_supplier": ["Supplier_ID", "Supplier_Name", "City", "Base_Lead_Time_Days", "Supplier_Rating", "Defect_Rate"],
    "dim_warehouse": ["Warehouse_ID", "Warehouse_Name", "Location_ID", "Capacity_Units", "Warehouse_Type"],
    "fact_inventory": ["Date_ID", "Inventory_Date", "Product_ID", "Warehouse_ID", "Opening_Stock", "Received_Qty", "Sold_Qty", "Damaged_Qty", "Closing_Stock", "Inventory_Value"],
    "fact_purchase_orders": ["PO_ID", "Supplier_ID", "Product_ID", "Warehouse_ID", "Order_Date", "Expected_Delivery_Date", "Actual_Delivery_Date", "Ordered_Qty", "Received_Qty", "Unit_Cost", "PO_Value"],
    "fact_returns": ["Return_ID", "Order_ID", "Product_ID", "Customer_ID", "Warehouse_ID", "Return_Date", "Returned_Qty", "Return_Reason", "Refund_Value"],
    "fact_sales": ["Order_ID", "Date_ID", "Order_Date", "Product_ID", "Customer_ID", "Warehouse_ID", "Quantity", "Unit_Price", "Discount_Rate", "Sales_Value"],
    "fact_shipments": ["Shipment_ID", "Order_ID", "Warehouse_ID", "Carrier_ID", "Dispatch_Date", "Expected_Delivery_Date", "Actual_Delivery_Date", "Distance_KM", "Shipping_Cost", "Delivery_Status"],
}

VIEW_NAMES = [
    "vw_executive_dashboard",
    "vw_sales_demand",
    "vw_inventory_analysis",
    "vw_procurement_analysis",
    "vw_logistics_analysis",
    "vw_returns_analysis",
]

# Dimensions before the facts that reference them, so a combined upload
# never inserts a fact row before the dimension row it points to exists.
LOAD_ORDER = [
    "dim_carrier",
    "dim_location",
    "dim_date",
    "dim_supplier",
    "dim_customer",
    "dim_warehouse",
    "dim_product",
    "fact_sales",
    "fact_inventory",
    "fact_purchase_orders",
    "fact_shipments",
    "fact_returns",
]


def resolve_db_columns(cursor, table_name, expected_columns):
    """Map CSV header names (Title_Case) to this table's actual DB column
    casing, so the upload works whether the DB folded identifiers to
    lowercase or preserved the original case."""
    cursor.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_name = %s",
        (table_name,),
    )
    db_columns = [r[0] for r in cursor.fetchall()]
    if not db_columns:
        raise HTTPException(status_code=500, detail=f"Table '{table_name}' not found in database.")

    lookup = {c.lower(): c for c in db_columns}
    resolved = []
    for col in expected_columns:
        actual = lookup.get(col.lower())
        if actual is None:
            raise HTTPException(
                status_code=500,
                detail=f"Server misconfiguration: DB table '{table_name}' has no column matching '{col}'.",
            )
        resolved.append(actual)
    return resolved


def get_primary_key_columns(cursor, table_name):
    """Returns this table's primary key column(s) in order, or [] if it has none."""
    cursor.execute(
        """
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = %s::regclass AND i.indisprimary
        ORDER BY array_position(i.indkey, a.attnum)
        """,
        (table_name,),
    )
    return [r[0] for r in cursor.fetchall()]


def parse_and_validate_csv(table_name, raw_bytes):
    """Decodes and validates one table's CSV bytes against TABLE_SCHEMAS.
    Returns (expected_columns, rows); raises HTTPException on any problem."""
    if table_name not in TABLE_SCHEMAS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown table '{table_name}'. Valid tables: {', '.join(TABLE_SCHEMAS)}",
        )

    try:
        text = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail=f"'{table_name}': file is not valid UTF-8 text.")

    reader = csv.DictReader(io.StringIO(text))
    expected_columns = TABLE_SCHEMAS[table_name]

    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail=f"'{table_name}': file appears to be empty.")

    actual_columns = list(reader.fieldnames)
    if actual_columns != expected_columns:
        missing = [c for c in expected_columns if c not in actual_columns]
        extra = [c for c in actual_columns if c not in expected_columns]
        detail = f"Column mismatch for '{table_name}'."
        if missing:
            detail += f" Missing: {', '.join(missing)}."
        if extra:
            detail += f" Unexpected: {', '.join(extra)}."
        detail += f" Expected exactly: {', '.join(expected_columns)}."
        raise HTTPException(status_code=400, detail=detail)

    rows = []
    for row in reader:
        rows.append(tuple(
            (row[col] if row[col] not in (None, "") else None)
            for col in expected_columns
        ))

    if not rows:
        raise HTTPException(status_code=400, detail=f"'{table_name}': file has a header row but no data rows.")

    return expected_columns, rows


def load_rows_into_table(conn, table_name, expected_columns, rows):
    """Truncates and reloads `table_name`, falling back to a primary-key
    upsert if a foreign key elsewhere blocks the TRUNCATE. Runs inside a
    SAVEPOINT so a caller managing a larger multi-table transaction can
    keep everything before this table intact even if this table falls
    back or fails. Does not commit — the caller controls the transaction.
    Returns (rows_loaded, replace_note | None)."""
    cursor = conn.cursor()
    db_column_names = resolve_db_columns(cursor, table_name, expected_columns)
    columns_sql = ", ".join(f'"{c}"' for c in db_column_names)
    insert_sql = f'INSERT INTO "{table_name}" ({columns_sql}) VALUES %s'
    savepoint = f"sp_{table_name}"

    replace_note = None
    cursor.execute(f'SAVEPOINT "{savepoint}";')
    try:
        cursor.execute(f'TRUNCATE TABLE "{table_name}";')
        execute_values(cursor, insert_sql, rows, page_size=1000)
        cursor.execute(f'RELEASE SAVEPOINT "{savepoint}";')
    except psycopg2.Error as db_exc:
        # Postgres raises TRUNCATE-blocked-by-FK as feature_not_supported
        # (0A000), not foreign_key_violation (23503) — that code is only
        # used for DELETE/INSERT/UPDATE constraint violations.
        if db_exc.pgcode != "0A000":  # genuine, unrelated failure
            raise
        cursor.execute(f'ROLLBACK TO SAVEPOINT "{savepoint}";')

        # Another table's foreign key blocks a full TRUNCATE (e.g. dim_carrier
        # is referenced by fact_shipments). Fall back to an upsert keyed on the
        # primary key instead: existing referenced rows get updated in place
        # rather than deleted, so dependent tables are never touched.
        pk_columns = get_primary_key_columns(cursor, table_name)
        if not pk_columns:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Cannot reload '{table_name}': it is referenced by another "
                    f"table's foreign key, and it has no primary key to safely "
                    f"update rows in place instead. Clear the dependent rows "
                    f"first, or add a primary key to '{table_name}'."
                ),
            )

        pk_list = ", ".join(f'"{c}"' for c in pk_columns)
        update_columns = [c for c in db_column_names if c not in pk_columns]
        conflict_action = (
            "DO UPDATE SET " + ", ".join(f'"{c}" = EXCLUDED."{c}"' for c in update_columns)
            if update_columns
            else "DO NOTHING"
        )
        upsert_sql = f'{insert_sql} ON CONFLICT ({pk_list}) {conflict_action}'
        execute_values(cursor, upsert_sql, rows, page_size=1000)
        cursor.execute(f'RELEASE SAVEPOINT "{savepoint}";')

        replace_note = (
            "existing rows were updated in place instead of fully replaced, "
            "because other tables reference this table by foreign key."
        )
    finally:
        cursor.close()

    return len(rows), replace_note


def refresh_all_views(conn):
    """Not all deployments use materialized views for vw_*, so each refresh
    is attempted independently and failures are swallowed — a plain view
    raises "... is not a materialized view", which is expected here."""
    for view_name in VIEW_NAMES:
        try:
            cursor = conn.cursor()
            cursor.execute(f'REFRESH MATERIALIZED VIEW "{view_name}";')
            conn.commit()
            cursor.close()
        except Exception:
            conn.rollback()


@app.post("/api/upload/{table_name}")
async def upload_table(table_name: str, file: UploadFile = File(...)):

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")

    raw_bytes = await file.read()
    expected_columns, rows = parse_and_validate_csv(table_name, raw_bytes)

    conn = get_connection()
    try:
        rows_loaded, replace_note = load_rows_into_table(conn, table_name, expected_columns, rows)
        conn.commit()

        refresh_all_views(conn)

        message = f"Replaced {table_name} with {rows_loaded} rows."
        if replace_note:
            message += f" Note: {replace_note}"

        return {
            "table": table_name,
            "rows_loaded": rows_loaded,
            "message": message,
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Load failed, no changes applied: {exc}")

    finally:
        conn.close()


@app.post("/api/upload-all")
async def upload_all_tables(file: UploadFile = File(...)):
    """Accepts one .zip containing any subset of the 12 table CSVs (named
    e.g. dim_supplier.csv, fact_sales.csv). Loads whichever are present, in
    dependency order, as a single all-or-nothing transaction."""

    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are accepted.")

    raw_bytes = await file.read()

    try:
        archive = zipfile.ZipFile(io.BytesIO(raw_bytes))
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="File is not a valid .zip archive.")

    name_lookup = {}
    for info in archive.infolist():
        if info.is_dir():
            continue
        base = info.filename.rsplit("/", 1)[-1]
        if not base.lower().endswith(".csv"):
            continue
        stem = base[:-4]
        if stem in TABLE_SCHEMAS:
            name_lookup[stem] = info.filename

    if not name_lookup:
        raise HTTPException(
            status_code=400,
            detail=(
                "No recognized table CSVs found in the zip. Expected filenames "
                f"like: {', '.join(t + '.csv' for t in TABLE_SCHEMAS)}."
            ),
        )

    # Parse and validate every present file up front, before touching the
    # database, so one bad file never leaves some tables loaded and others not.
    parsed = {}
    for table_name in LOAD_ORDER:
        if table_name not in name_lookup:
            continue
        raw = archive.read(name_lookup[table_name])
        parsed[table_name] = parse_and_validate_csv(table_name, raw)

    conn = get_connection()
    try:
        results = []
        for table_name in LOAD_ORDER:
            if table_name not in parsed:
                continue
            expected_columns, rows = parsed[table_name]
            rows_loaded, replace_note = load_rows_into_table(conn, table_name, expected_columns, rows)
            results.append({
                "table": table_name,
                "rows_loaded": rows_loaded,
                "note": replace_note,
            })

        conn.commit()
        refresh_all_views(conn)

        return {
            "tables_loaded": len(results),
            "results": results,
            "message": f"Loaded {len(results)} table(s) from {file.filename}.",
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Batch load failed, no changes applied: {exc}")

    finally:
        conn.close()


@app.get("/api/inventory")
def inventory():

    conn = get_connection()

    try:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT *
            FROM vw_inventory_analysis
            LIMIT 1000;
        """)

        rows = cursor.fetchall()

        columns = [
            description[0]
            for description in cursor.description
        ]

        return [
            dict(zip(columns, row))
            for row in rows
        ]

    finally:
        cursor.close()
        conn.close()


@app.get("/api/procurement")
def procurement():

    conn = get_connection()

    try:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT *
            FROM vw_procurement_analysis
            LIMIT 1000;
        """)

        rows = cursor.fetchall()

        columns = [
            description[0]
            for description in cursor.description
        ]

        return [
            dict(zip(columns, row))
            for row in rows
        ]

    finally:
        cursor.close()
        conn.close()


@app.get("/api/logistics")
def logistics():

    conn = get_connection()

    try:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT *
            FROM vw_logistics_analysis
            LIMIT 1000;
        """)

        rows = cursor.fetchall()

        columns = [
            description[0]
            for description in cursor.description
        ]

        return [
            dict(zip(columns, row))
            for row in rows
        ]

    finally:
        cursor.close()
        conn.close()


@app.get("/api/returns")
def returns():

    conn = get_connection()

    try:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT *
            FROM vw_returns_analysis
            LIMIT 1000;
        """)

        rows = cursor.fetchall()

        columns = [
            description[0]
            for description in cursor.description
        ]

        return [
            dict(zip(columns, row))
            for row in rows
        ]

    finally:
        cursor.close()
        conn.close()


# --------------------------------------------------------------------------- #
# Paginated, searchable row-level drill-downs (behind KPI cards on the
# frontend). These query the base fact tables directly rather than the
# capped analysis views, since a KPI like "Total Orders" needs access to
# every underlying row, not just the top-N used for charts.
# --------------------------------------------------------------------------- #

def fetch_paginated(select_sql, from_sql, search_columns, order_by_sql, page, page_size, search):
    """Runs a paginated, optionally-searched SELECT. `search_columns` is a list
    of SQL expressions (already qualified, e.g. "fs.order_id") ORed together
    with ILIKE against `search`. Total row count is computed via a window
    function so only one query round-trip is needed."""
    conn = get_connection()
    try:
        cursor = conn.cursor()

        where_sql = ""
        params = []
        search = (search or "").strip()
        if search:
            pattern = f"%{search}%"
            conditions = " OR ".join(f"{col} ILIKE %s" for col in search_columns)
            where_sql = f"WHERE {conditions}"
            params = [pattern] * len(search_columns)

        offset = (page - 1) * page_size
        query = f"""
            SELECT {select_sql}, COUNT(*) OVER() AS total_count
            FROM {from_sql}
            {where_sql}
            ORDER BY {order_by_sql}
            LIMIT %s OFFSET %s
        """
        params.extend([page_size, offset])

        cursor.execute(query, params)
        rows = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        results = [dict(zip(columns, row)) for row in rows]

        total = results[0]["total_count"] if results else 0
        for r in results:
            r.pop("total_count", None)

        return {"page": page, "page_size": page_size, "total": total, "rows": results}

    finally:
        cursor.close()
        conn.close()


PageParam = Query(1, ge=1)
PageSizeParam = Query(25, ge=1, le=100)
SearchParam = Query("")


@app.get("/api/sales/orders")
def sales_orders(page: int = PageParam, page_size: int = PageSizeParam, search: str = SearchParam):
    return fetch_paginated(
        select_sql="""
            fs.order_id, fs.order_date, fs.product_id, p.product_name,
            fs.customer_id, fs.warehouse_id, w.warehouse_name,
            fs.quantity, fs.unit_price, fs.discount_rate, fs.sales_value
        """,
        from_sql="""
            fact_sales fs
            LEFT JOIN dim_product p ON fs.product_id = p.product_id
            LEFT JOIN dim_warehouse w ON fs.warehouse_id = w.warehouse_id
        """,
        search_columns=["fs.order_id", "fs.customer_id", "p.product_name", "w.warehouse_name"],
        order_by_sql="fs.order_date DESC, fs.order_id DESC",
        page=page, page_size=page_size, search=search,
    )


@app.get("/api/inventory/records")
def inventory_records(page: int = PageParam, page_size: int = PageSizeParam, search: str = SearchParam):
    return fetch_paginated(
        select_sql="""
            fi.inventory_date, fi.product_id, p.product_name,
            fi.warehouse_id, w.warehouse_name,
            fi.opening_stock, fi.received_qty, fi.sold_qty, fi.damaged_qty,
            fi.closing_stock, fi.inventory_value, fi.stockout_flag
        """,
        from_sql="""
            fact_inventory fi
            LEFT JOIN dim_product p ON fi.product_id = p.product_id
            LEFT JOIN dim_warehouse w ON fi.warehouse_id = w.warehouse_id
        """,
        search_columns=["fi.product_id", "p.product_name", "w.warehouse_name"],
        order_by_sql="fi.inventory_date DESC, fi.product_id, fi.warehouse_id",
        page=page, page_size=page_size, search=search,
    )


@app.get("/api/procurement/orders")
def procurement_orders(page: int = PageParam, page_size: int = PageSizeParam, search: str = SearchParam):
    return fetch_paginated(
        select_sql="""
            po.po_id, po.order_date, po.expected_delivery_date, po.actual_delivery_date,
            po.supplier_id, s.supplier_name, po.product_id, p.product_name,
            po.warehouse_id, w.warehouse_name,
            po.ordered_qty, po.received_qty, po.unit_cost, po.po_value,
            CASE WHEN po.actual_delivery_date <= po.expected_delivery_date
                 THEN 'ON_TIME' ELSE 'LATE' END AS delivery_status
        """,
        from_sql="""
            fact_purchase_orders po
            LEFT JOIN dim_supplier s ON po.supplier_id = s.supplier_id
            LEFT JOIN dim_product p ON po.product_id = p.product_id
            LEFT JOIN dim_warehouse w ON po.warehouse_id = w.warehouse_id
        """,
        search_columns=["po.po_id", "s.supplier_name", "p.product_name", "w.warehouse_name"],
        order_by_sql="po.order_date DESC, po.po_id DESC",
        page=page, page_size=page_size, search=search,
    )


@app.get("/api/logistics/shipments")
def logistics_shipments(page: int = PageParam, page_size: int = PageSizeParam, search: str = SearchParam):
    return fetch_paginated(
        select_sql="""
            sh.shipment_id, sh.order_id, sh.warehouse_id, w.warehouse_name,
            sh.carrier_id, c.carrier_name,
            sh.dispatch_date, sh.expected_delivery_date, sh.actual_delivery_date,
            sh.distance_km, sh.shipping_cost, sh.delivery_status
        """,
        from_sql="""
            fact_shipments sh
            LEFT JOIN dim_warehouse w ON sh.warehouse_id = w.warehouse_id
            LEFT JOIN dim_carrier c ON sh.carrier_id = c.carrier_id
        """,
        search_columns=["sh.shipment_id", "sh.order_id", "c.carrier_name", "w.warehouse_name"],
        order_by_sql="sh.dispatch_date DESC, sh.shipment_id DESC",
        page=page, page_size=page_size, search=search,
    )


@app.get("/api/returns/records")
def returns_records(page: int = PageParam, page_size: int = PageSizeParam, search: str = SearchParam):
    return fetch_paginated(
        select_sql="""
            r.return_id, r.order_id, r.product_id, p.product_name,
            r.customer_id, r.warehouse_id, w.warehouse_name,
            r.return_date, r.returned_qty, r.return_reason, r.refund_value
        """,
        from_sql="""
            fact_returns r
            LEFT JOIN dim_product p ON r.product_id = p.product_id
            LEFT JOIN dim_warehouse w ON r.warehouse_id = w.warehouse_id
        """,
        search_columns=["r.return_id", "r.order_id", "p.product_name", "r.return_reason", "w.warehouse_name"],
        order_by_sql="r.return_date DESC, r.return_id DESC",
        page=page, page_size=page_size, search=search,
    )