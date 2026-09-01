# PostgreSQL Schema Report — Supply Chain Analytics

Generated from direct inspection of `data/cleaned/*.csv` (the sole source of truth for this schema). No columns were guessed — every data type, nullability, and candidate key below was verified against the actual cleaned data, and the full DDL was then executed against a live PostgreSQL 16 instance and **all 12 cleaned CSVs were loaded successfully with zero constraint violations**, which is the strongest available confirmation that the schema matches the data.

---

## 0. Verification Method

1. Loaded every CSV in `data/cleaned/` with pandas; profiled dtype, null count, distinct-value count, and (for text columns) max string length per column.
2. Explicitly tested the two candidate keys called out in the request:
   - `fact_sales.Order_ID` — **unique** (143,495 distinct values across 143,495 rows).
   - `fact_inventory.(Date_ID, Product_ID, Warehouse_ID)` — **unique** (146,200 distinct combinations across 146,200 rows).
3. Tested every other candidate primary key (all unique) and all 16 candidate foreign-key relationships against their parent tables — **zero orphaned keys anywhere**.
4. Wrote `sql/01_create_tables.sql`, ran it against a fresh PostgreSQL 16 database, then `\copy`'d all 12 cleaned CSVs directly into the new tables. All 12 loads succeeded with row counts matching the source CSVs exactly, and derived-flag aggregates (`stockout_flag`, `sales_outlier_flag`, `customer_since_corrected_flag` counts) matched the cleaning pipeline's own reported figures.

---

## 1. Table Grain

| Table | Grain | Row Count |
|---|---|---|
| `dim_location` | One row per location | 6 |
| `dim_supplier` | One row per supplier | 12 |
| `dim_carrier` | One row per shipping carrier | 6 |
| `dim_date` | One row per calendar date | 731 |
| `dim_customer` | One row per customer | 1,000 |
| `dim_warehouse` | One row per warehouse | 5 |
| `dim_product` | One row per product | 40 |
| `fact_sales` | One row per sales order line | 143,495 |
| `fact_inventory` | One row per (date, product, warehouse) daily snapshot | 146,200 |
| `fact_purchase_orders` | One row per purchase order | 8,292 |
| `fact_shipments` | One row per shipment (currently 1:1 with sales orders) | 143,495 |
| `fact_returns` | One row per return | 7,192 |

---

## 2. Primary Keys

| Table | Primary Key | Verified Unique? |
|---|---|---|
| `dim_location` | `location_id` | Yes (6/6) |
| `dim_supplier` | `supplier_id` | Yes (12/12) |
| `dim_carrier` | `carrier_id` | Yes (6/6) |
| `dim_date` | `date_id` | Yes (731/731); `date` also unique (added as a secondary `UNIQUE` constraint) |
| `dim_customer` | `customer_id` | Yes (1,000/1,000) |
| `dim_warehouse` | `warehouse_id` | Yes (5/5) |
| `dim_product` | `product_id` | Yes (40/40) |
| `fact_sales` | `order_id` | **Explicitly verified**: 143,495 distinct values / 143,495 rows. No surrogate key needed. |
| `fact_inventory` | `(date_id, product_id, warehouse_id)` composite | **Explicitly verified**: 146,200 distinct combinations / 146,200 rows. No surrogate key needed. |
| `fact_purchase_orders` | `po_id` | Yes (8,292/8,292) |
| `fact_shipments` | `shipment_id` | Yes (143,495/143,495) |
| `fact_returns` | `return_id` | Yes (7,192/7,192) |

---

## 3. Foreign Keys

| Child.Column | Parent.Column | Orphans Found |
|---|---|---|
| `dim_customer.location_id` | `dim_location.location_id` | 0 |
| `dim_warehouse.location_id` | `dim_location.location_id` | 0 |
| `dim_product.primary_supplier_id` | `dim_supplier.supplier_id` | 0 |
| `fact_sales.date_id` | `dim_date.date_id` | 0 |
| `fact_sales.product_id` | `dim_product.product_id` | 0 |
| `fact_sales.customer_id` | `dim_customer.customer_id` | 0 |
| `fact_sales.warehouse_id` | `dim_warehouse.warehouse_id` | 0 |
| `fact_inventory.date_id` | `dim_date.date_id` | 0 |
| `fact_inventory.product_id` | `dim_product.product_id` | 0 |
| `fact_inventory.warehouse_id` | `dim_warehouse.warehouse_id` | 0 |
| `fact_purchase_orders.supplier_id` | `dim_supplier.supplier_id` | 0 |
| `fact_purchase_orders.product_id` | `dim_product.product_id` | 0 |
| `fact_purchase_orders.warehouse_id` | `dim_warehouse.warehouse_id` | 0 |
| `fact_shipments.order_id` | `fact_sales.order_id` | 0 (also `UNIQUE`, see assumption 7) |
| `fact_shipments.warehouse_id` | `dim_warehouse.warehouse_id` | 0 |
| `fact_shipments.carrier_id` | `dim_carrier.carrier_id` | 0 |
| `fact_returns.order_id` | `fact_sales.order_id` | 0 (not `UNIQUE`, see assumption 8) |
| `fact_returns.product_id` | `dim_product.product_id` | 0 |
| `fact_returns.customer_id` | `dim_customer.customer_id` | 0 |
| `fact_returns.warehouse_id` | `dim_warehouse.warehouse_id` | 0 |

**Not a foreign key:** `fact_purchase_orders`, `fact_shipments`, and `fact_returns` all contain plain `DATE` columns (`Order_Date`, `Dispatch_Date`, `Return_Date`, and their `Expected_/Actual_Delivery_Date` counterparts) that are **not** linked to `dim_date` — see assumption 1 below for why.

---

## 4. Indexes

Indexes were added only where the table is large enough to benefit and the column is either a foreign key used in joins or a column likely to be filtered/grouped on in analytics. No indexes were added to the small dimension tables (`dim_location`, `dim_supplier`, `dim_carrier`, `dim_warehouse`, `dim_product` — all ≤40 rows) beyond their primary keys, since a sequential scan is cheap and an index would add write overhead for no query benefit.

| Table | Index | Rationale |
|---|---|---|
| `dim_customer` | `location_id` | 1,000-row dimension commonly joined/grouped by region |
| `fact_sales` | `date_id`, `product_id`, `customer_id`, `warehouse_id` | FK join columns on a 143K-row fact table |
| `fact_sales` | `order_date` | Common analytical filter/date-range column |
| `fact_sales` | `sales_outlier_flag` (partial, `WHERE sales_outlier_flag`) | Cheap, targeted index for the specific "show me the flagged rows" query pattern |
| `fact_inventory` | `product_id`, `warehouse_id` | FK join columns on a 146K-row fact table (`date_id` is already the leading column of the composite PK, so no separate index needed) |
| `fact_inventory` | `stockout_flag` (partial, `WHERE stockout_flag`) | Same rationale as the sales outlier partial index |
| `fact_purchase_orders` | `supplier_id`, `product_id`, `warehouse_id`, `order_date` | FK join columns + common date filter |
| `fact_shipments` | `warehouse_id`, `carrier_id`, `dispatch_date`, `delivery_status` | FK join columns + common analytical filters (on-time vs. late analysis) |
| `fact_returns` | `order_id`, `product_id`, `customer_id`, `return_date` | FK join columns + common date filter |

---

## 5. Important Assumptions

1. **`dim_date` does not cover the full date range used elsewhere.** `dim_date` spans 2024-01-01 through 2025-12-31 (731 days), but `Expected_Delivery_Date`/`Actual_Delivery_Date` in `fact_purchase_orders` and `fact_shipments`, and `Return_Date` in `fact_returns`, extend into January 2026 (fulfillment/return lag past the last order date). Since those columns have no `Date_ID`-style key and their values fall outside `dim_date`'s range, they are stored as plain `DATE` columns with **no foreign key to `dim_date`**, rather than force-truncating real dates or extending `dim_date` speculatively. If a conformed date dimension across all tables is required, `dim_date` should be regenerated to cover through at least 2026-01-31 first.
2. **`fact_inventory.stockout_flag`/`stockout_shortfall_units` reflect a preserved business condition, not an error.** Per the approved cleaning plan, `Opening_Stock`, `Received_Qty`, `Sold_Qty`, `Damaged_Qty`, and `Closing_Stock` are loaded as-is; in 11,216 rows (7.67%) the unit-conservation formula goes negative (demand exceeded available stock) and `Closing_Stock` is floored at 0 rather than corrected. The two derived flag columns make this explicitly queryable without altering the underlying figures.
3. **All monetary columns use `NUMERIC`, not `FLOAT`/`REAL`,** to avoid floating-point rounding drift in financial aggregates. Precision/scale were sized with headroom above the observed max values (e.g. `fact_purchase_orders.po_value` max observed is ~$1.50M at `NUMERIC(14,2)`, `fact_inventory.inventory_value` max observed is ~$4.57M at `NUMERIC(14,2)`).
4. **`dim_product.product_status` is constant (`'Active'` for all 40 rows).** Retained exactly as-is per the approved cleaning plan — not treated as an error, just documented as a column with no realized variance in the current dataset.
5. **`fact_sales.sales_outlier_flag`** marks the 1,078 rows (0.75%) falling outside a 3×IQR fence on `Sales_Value`; `Sales_Value` itself is unaltered. These are treated as legitimate high-value transactions pending further business validation, not data errors.
6. **`fact_purchase_orders.po_value` is priced on `Ordered_Qty × Unit_Cost`, not `Received_Qty × Unit_Cost`.** This is consistent across all 8,292 rows (i.e., it's the stated business rule, not an error), but it means `po_value` represents value *ordered*, not value *received into inventory*. Any KPI intending to measure landed cost of goods received should compute `received_qty * unit_cost` directly rather than relying on `po_value`.
7. **`fact_shipments.order_id` is enforced `UNIQUE`.** In the current data every shipment maps to exactly one sales order and vice versa (1:1). This was verified, not assumed, and is now enforced at the database level. If the business later introduces split/partial shipments (one order → multiple shipments), this `UNIQUE` constraint will need to be dropped and the relationship re-modeled as one-to-many.
8. **`fact_returns.order_id` is *not* enforced `UNIQUE`,** even though it happens to be unique in the current 7,192-row dataset (one return per order so far). A real returns process can plausibly involve multiple partial-return events against the same order, so the schema deliberately leaves room for that rather than baking in today's coincidental 1:1 pattern.
9. **VARCHAR lengths were sized with headroom above observed max length** (e.g. `Product_ID` max observed length is 5 chars, sized as `VARCHAR(10)`; `Order_ID`/`Return_ID`/`Shipment_ID` max observed length is 11 chars, sized as `VARCHAR(20)`) to tolerate reasonable ID-format growth without requiring a migration, while still catching genuinely malformed input.
10. **No columns are nullable.** Every column in every cleaned CSV had zero nulls at profiling time, so every column is declared `NOT NULL`. If a future data refresh introduces legitimate nulls (e.g. a return with no assigned reason), the affected column's constraint will need to be relaxed.

---

## 6. Data-Quality Concerns Relevant to Database Design

- **None of the four issues identified in the original data-quality audit block schema design** — the inventory-conservation condition and sales outliers are preserved-and-flagged by design (assumptions 2 and 5), the `Customer_Since` temporal-impossibility was already corrected upstream in `data/cleaned/` (verified: `customer_since <= earliest order_date` holds for all 1,000 customers), and `Product_Status`'s lack of variance is informational only.
- **The `dim_date` coverage gap (assumption 1)** is the one design-relevant concern this schema pass surfaced that wasn't flagged in the original audit — it doesn't block table creation (those date columns just aren't FK'd), but it does mean date-dimension joins (e.g. "which fiscal quarter did this PO deliver in") won't resolve for the ~2% of delivery/return dates that fall in January 2026. Worth deciding whether to extend `dim_date` in a future pipeline run if that reporting need comes up.
- **All CHECK constraints in `01_create_tables.sql` were validated against the full loaded dataset** (not just a sample) — quantities, rates, and date-ordering constraints all passed on every one of the 146,200+143,495+143,495+8,292+7,192 fact rows loaded during verification.
