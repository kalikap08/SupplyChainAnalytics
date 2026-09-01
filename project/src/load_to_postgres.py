"""
Load cleaned CSVs into PostgreSQL — Supply Chain Analytics
=============================================================

Loads data/cleaned/*.csv into the schema already created by
sql/01_create_tables.sql, respecting the existing PRIMARY KEY / FOREIGN KEY
constraints. Uses PostgreSQL's COPY protocol (via psycopg2's copy_expert)
for bulk loading — no row-by-row INSERTs.

Load order (dimensions before the facts that reference them; fact_shipments
and fact_returns after fact_sales, since both FK-reference it):

    dim_location, dim_supplier, dim_carrier, dim_date,
    dim_customer, dim_warehouse, dim_product,
    fact_sales, fact_inventory, fact_purchase_orders,
    fact_shipments, fact_returns

--------------------------------------------------------------------------
RERUN BEHAVIOR (why this script is safe to run more than once)
--------------------------------------------------------------------------
This script never drops tables and never deletes data on its own. On each
run, before loading a table it checks how many rows are already in it:

  * Table is empty (0 rows)      -> load normally via COPY.
  * Table already has rows       -> the load is SKIPPED by default (no
                                     duplicate rows are ever inserted), and
                                     the summary reports whether the
                                     pre-existing row count still matches
                                     the CSV (PASS) or not (FAIL / MISMATCH,
                                     which likely means a previous run only
                                     partially completed).
  * --truncate flag is passed    -> the ONLY way this script will ever
                                     remove existing data. It empties every
                                     target table (in reverse dependency
                                     order: facts first, then dimensions) at
                                     the very start of the run, then loads
                                     everything fresh. This is an explicit,
                                     opt-in action — never automatic.

So: `python load_to_postgres.py` is always safe to re-run and will never
silently duplicate rows. `python load_to_postgres.py --truncate` is the
explicit "reset and reload from scratch" path for a development database.

Each table is loaded inside its own transaction. If a COPY fails partway
through a table (e.g. a constraint violation), that table's transaction is
rolled back — no partial rows are left behind for that table — and the
script reports FAIL for it. If a dimension table a fact table depends on
failed or was never loaded, the dependent fact table's load is skipped
rather than attempted, since it would otherwise fail on a foreign key.

--------------------------------------------------------------------------
CONNECTION CONFIGURATION (no password is hard-coded anywhere in this file)
--------------------------------------------------------------------------
Reads standard libpq environment variables:
    PGHOST      (default: localhost)
    PGPORT      (default: 5432)
    PGDATABASE  (required)
    PGUSER      (required)
    PGPASSWORD  (required — set this in your shell/session, not in code)

Usage:
    python load_to_postgres.py [--data-dir data/cleaned] [--truncate]
"""

import argparse
import os
import sys
from dataclasses import dataclass, field

import pandas as pd
import psycopg2


# --------------------------------------------------------------------------- #
# Table definitions, in dependency (load) order
# --------------------------------------------------------------------------- #

@dataclass
class TableSpec:
    name: str
    depends_on: list = field(default_factory=list)  # tables that must be loaded first


LOAD_ORDER: list[TableSpec] = [
    TableSpec("dim_location"),
    TableSpec("dim_supplier"),
    TableSpec("dim_carrier"),
    TableSpec("dim_date"),
    TableSpec("dim_customer", depends_on=["dim_location"]),
    TableSpec("dim_warehouse", depends_on=["dim_location"]),
    TableSpec("dim_product", depends_on=["dim_supplier"]),
    TableSpec("fact_sales", depends_on=["dim_date", "dim_product", "dim_customer", "dim_warehouse"]),
    TableSpec("fact_inventory", depends_on=["dim_date", "dim_product", "dim_warehouse"]),
    TableSpec("fact_purchase_orders", depends_on=["dim_supplier", "dim_product", "dim_warehouse"]),
    TableSpec("fact_shipments", depends_on=["fact_sales", "dim_warehouse", "dim_carrier"]),
    TableSpec("fact_returns", depends_on=["fact_sales", "dim_product", "dim_customer", "dim_warehouse"]),
]


# --------------------------------------------------------------------------- #
# Connection
# --------------------------------------------------------------------------- #

def get_connection():
    required = ["PGDATABASE", "PGUSER", "PGPASSWORD"]
    missing = [v for v in required if not os.environ.get(v)]
    if missing:
        print(f"ERROR: missing required environment variable(s): {', '.join(missing)}", file=sys.stderr)
        print("Set PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD before running "
              "this script (see the accompanying instructions).", file=sys.stderr)
        sys.exit(1)

    return psycopg2.connect(
        host=os.environ.get("PGHOST", "localhost"),
        port=os.environ.get("PGPORT", "5432"),
        dbname=os.environ["PGDATABASE"],
        user=os.environ["PGUSER"],
        password=os.environ["PGPASSWORD"],
    )


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def csv_row_count(csv_path: str) -> int:
    # len(df) rather than a line count, so it's robust to quoted newlines etc.
    return len(pd.read_csv(csv_path))


def csv_columns(csv_path: str) -> list[str]:
    with open(csv_path, "r", encoding="utf-8") as fh:
        header = fh.readline().strip()
    return [c.strip().lower() for c in header.split(",")]


def db_row_count(conn, table: str) -> int:
    with conn.cursor() as cur:
        cur.execute(f"SELECT COUNT(*) FROM {table};")
        return cur.fetchone()[0]


def truncate_all(conn, specs: list[TableSpec]):
    """Empty every target table. Only called when --truncate is explicitly
    passed. PostgreSQL's TRUNCATE refuses to empty a table that is still
    referenced by an FK from another table unless every such table is
    truncated in the SAME statement (or CASCADE is used) — so all tables are
    listed together in one combined TRUNCATE rather than one-at-a-time."""
    print("\n--truncate specified: clearing existing data from all target tables "
          "before reloading...\n")
    table_list = ", ".join(spec.name for spec in specs)
    with conn.cursor() as cur:
        cur.execute(f"TRUNCATE TABLE {table_list};")
    conn.commit()
    for spec in specs:
        print(f"  Truncated {spec.name}")
    print()


def copy_csv_into_table(conn, table: str, csv_path: str, columns: list[str]) -> int:
    """Bulk-loads csv_path into table using COPY. Runs in its own transaction:
    commits on success, rolls back (and re-raises) on any error."""
    col_list = ", ".join(columns)
    copy_sql = f"COPY {table} ({col_list}) FROM STDIN WITH (FORMAT csv, HEADER true)"
    with conn.cursor() as cur:
        with open(csv_path, "r", encoding="utf-8") as fh:
            cur.copy_expert(copy_sql, fh)
    conn.commit()
    return db_row_count(conn, table)


# --------------------------------------------------------------------------- #
# Main load routine
# --------------------------------------------------------------------------- #

def main():
    parser = argparse.ArgumentParser(description="Bulk-load data/cleaned/*.csv into PostgreSQL.")
    parser.add_argument("--data-dir", default="data/cleaned",
                         help="Directory containing the cleaned CSVs (default: data/cleaned).")
    parser.add_argument("--truncate", action="store_true",
                         help="Explicitly empty target tables before loading (the only way this "
                              "script removes existing data — never automatic).")
    args = parser.parse_args()

    conn = get_connection()
    print(f"Connected to database '{os.environ['PGDATABASE']}' on "
          f"{os.environ.get('PGHOST', 'localhost')}:{os.environ.get('PGPORT', '5432')} "
          f"as '{os.environ['PGUSER']}'.\n")

    if args.truncate:
        truncate_all(conn, LOAD_ORDER)

    results = []          # (table, csv_rows, db_rows, status, note)
    failed_or_skipped = set()

    for spec in LOAD_ORDER:
        table = spec.name
        csv_path = os.path.join(args.data_dir, f"{table}.csv")

        print(f"Loading {table}...")

        if not os.path.exists(csv_path):
            print(f"  ERROR: {csv_path} not found.")
            results.append((table, None, None, "FAIL", "CSV file not found"))
            failed_or_skipped.add(table)
            continue

        # Skip if a dependency failed/was skipped — a fact load here would
        # just fail on a foreign key, so don't attempt it.
        blocked_by = [d for d in spec.depends_on if d in failed_or_skipped]
        if blocked_by:
            print(f"  SKIPPED: dependency table(s) not successfully loaded: {blocked_by}")
            results.append((table, csv_row_count(csv_path), db_row_count(conn, table),
                             "SKIPPED", f"blocked by {blocked_by}"))
            failed_or_skipped.add(table)
            continue

        expected_rows = csv_row_count(csv_path)
        existing_rows = db_row_count(conn, table)

        if existing_rows > 0:
            # Rerun-safe default: never insert on top of existing data.
            status = "PASS" if existing_rows == expected_rows else "FAIL"
            note = ("table already loaded — skipped (rerun-safe default)" if status == "PASS"
                    else "table already has data but row count does not match CSV — "
                         "investigate before using --truncate to reload")
            print(f"  Table already contains {existing_rows} rows — skipping load.")
            print(f"  ({note})")
            results.append((table, expected_rows, existing_rows, status, note))
            if status == "FAIL":
                failed_or_skipped.add(table)
            continue

        columns = csv_columns(csv_path)
        try:
            loaded_rows = copy_csv_into_table(conn, table, csv_path, columns)
            print(f"  Loaded {loaded_rows} rows")
            status = "PASS" if loaded_rows == expected_rows else "FAIL"
            note = "" if status == "PASS" else "row count mismatch after load"
            results.append((table, expected_rows, loaded_rows, status, note))
            if status == "FAIL":
                failed_or_skipped.add(table)
        except Exception as exc:
            conn.rollback()
            print(f"  ERROR loading {table}: {exc}")
            print(f"  Transaction rolled back — no partial rows were committed for {table}.")
            results.append((table, expected_rows, db_row_count(conn, table), "FAIL", str(exc)))
            failed_or_skipped.add(table)

    conn.close()

    # ---- summary ---- #
    print("\n" + "=" * 78)
    print(f"{'Table':<24}{'CSV Rows':<12}{'DB Rows':<12}{'Status':<10}Notes")
    print("=" * 78)
    any_fail = False
    for table, csv_rows, db_rows, status, note in results:
        if status == "FAIL":
            any_fail = True
        csv_str = str(csv_rows) if csv_rows is not None else "?"
        db_str = str(db_rows) if db_rows is not None else "?"
        print(f"{table:<24}{csv_str:<12}{db_str:<12}{status:<10}{note}")
    print("=" * 78)

    if any_fail:
        print("\nOne or more tables FAILED or were SKIPPED due to a blocked dependency. "
              "See notes above.")
        sys.exit(1)
    else:
        print("\nAll tables loaded and verified successfully.")


if __name__ == "__main__":
    main()
