-- =============================================================================
-- Supply Chain Analytics — PostgreSQL Schema
-- =============================================================================
-- Generated from inspection of data/cleaned/*.csv (the sole source of truth
-- for this schema, per project convention). No data is loaded by this script.
--
-- Safe to run on a fresh database: tables are created in dependency order
-- (dimensions before facts, referenced dimensions before dependent dimensions)
-- and the script does not DROP or truncate anything, so re-running it against
-- a database that already has these tables will simply fail loudly on the
-- first CREATE TABLE rather than silently clobbering data.
--
-- Column list, data types, nullability, and candidate keys were derived by
-- profiling data/cleaned/*.csv directly (dtypes, null counts, uniqueness,
-- value ranges, string lengths, decimal precision) — see the accompanying
-- schema report for the verification results, in particular the explicit
-- uniqueness checks on fact_sales.Order_ID and the
-- (Date_ID, Product_ID, Warehouse_ID) composite in fact_inventory.
-- =============================================================================

BEGIN;

-- =============================================================================
-- DIMENSION TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- dim_location  (no FK dependencies)
-- Grain: one row per location. 6 rows in data/cleaned/.
-- ---------------------------------------------------------------------------
CREATE TABLE dim_location (
    location_id     VARCHAR(10)     NOT NULL,
    city            VARCHAR(50)     NOT NULL,
    region          VARCHAR(20)     NOT NULL,
    country         VARCHAR(20)     NOT NULL,
    CONSTRAINT pk_dim_location PRIMARY KEY (location_id)
);
COMMENT ON TABLE dim_location IS
    'Geographic locations used by dim_customer and dim_warehouse. Grain: one row per Location_ID.';

-- ---------------------------------------------------------------------------
-- dim_supplier  (no FK dependencies)
-- Grain: one row per supplier. 12 rows in data/cleaned/.
-- ---------------------------------------------------------------------------
CREATE TABLE dim_supplier (
    supplier_id           VARCHAR(10)     NOT NULL,
    supplier_name         VARCHAR(100)    NOT NULL,
    city                  VARCHAR(50)     NOT NULL,
    base_lead_time_days   INTEGER         NOT NULL,
    supplier_rating       NUMERIC(2,1)    NOT NULL,
    defect_rate           NUMERIC(5,3)    NOT NULL,
    CONSTRAINT pk_dim_supplier PRIMARY KEY (supplier_id),
    CONSTRAINT ck_dim_supplier_lead_time_nonneg CHECK (base_lead_time_days >= 0),
    CONSTRAINT ck_dim_supplier_rating_range CHECK (supplier_rating BETWEEN 0 AND 5),
    CONSTRAINT ck_dim_supplier_defect_rate_range CHECK (defect_rate BETWEEN 0 AND 1)
);
COMMENT ON TABLE dim_supplier IS
    'Suppliers. Grain: one row per Supplier_ID.';

-- ---------------------------------------------------------------------------
-- dim_carrier  (no FK dependencies)
-- Grain: one row per shipping carrier. 6 rows in data/cleaned/.
-- ---------------------------------------------------------------------------
CREATE TABLE dim_carrier (
    carrier_id                   VARCHAR(10)     NOT NULL,
    carrier_name                 VARCHAR(50)     NOT NULL,
    late_delivery_probability    NUMERIC(5,3)    NOT NULL,
    base_shipping_cost           NUMERIC(10,2)   NOT NULL,
    CONSTRAINT pk_dim_carrier PRIMARY KEY (carrier_id),
    CONSTRAINT ck_dim_carrier_late_prob_range CHECK (late_delivery_probability BETWEEN 0 AND 1),
    CONSTRAINT ck_dim_carrier_cost_nonneg CHECK (base_shipping_cost >= 0)
);
COMMENT ON TABLE dim_carrier IS
    'Shipping carriers. Grain: one row per Carrier_ID.';

-- ---------------------------------------------------------------------------
-- dim_date  (no FK dependencies)
-- Grain: one row per calendar date. 731 rows (2024-01-01 through 2025-12-31)
-- in data/cleaned/.
-- NOTE: several fact-table date columns (PO/shipment/return delivery dates)
-- extend past 2025-12-31 into January 2026 — see schema report, assumption 1.
-- ---------------------------------------------------------------------------
CREATE TABLE dim_date (
    date_id         INTEGER         NOT NULL,   -- YYYYMMDD surrogate key
    date            DATE            NOT NULL,
    year            SMALLINT        NOT NULL,
    quarter         VARCHAR(2)      NOT NULL,
    month           SMALLINT        NOT NULL,
    month_name      VARCHAR(15)     NOT NULL,
    week            SMALLINT        NOT NULL,
    day             SMALLINT        NOT NULL,
    day_name        VARCHAR(15)     NOT NULL,
    is_weekend      BOOLEAN         NOT NULL,
    is_month_end    BOOLEAN         NOT NULL,
    CONSTRAINT pk_dim_date PRIMARY KEY (date_id),
    CONSTRAINT uq_dim_date_date UNIQUE (date)
);
COMMENT ON TABLE dim_date IS
    'Calendar date dimension. Grain: one row per Date_ID (YYYYMMDD). '
    'Covers 2024-01-01 through 2025-12-31 only — does not cover all dates '
    'referenced elsewhere in the dataset (see schema report).';

-- ---------------------------------------------------------------------------
-- dim_customer  (FK -> dim_location)
-- Grain: one row per customer. 1000 rows in data/cleaned/.
-- ---------------------------------------------------------------------------
CREATE TABLE dim_customer (
    customer_id                        VARCHAR(10)     NOT NULL,
    customer_name                      VARCHAR(100)    NOT NULL,
    customer_type                      VARCHAR(20)     NOT NULL,
    location_id                        VARCHAR(10)     NOT NULL,
    sales_channel                      VARCHAR(20)     NOT NULL,
    customer_since                     DATE            NOT NULL,   -- corrected value
    customer_since_original            DATE            NOT NULL,   -- pre-correction value, preserved for audit
    customer_since_corrected_flag      BOOLEAN         NOT NULL,   -- True where customer_since was corrected
    CONSTRAINT pk_dim_customer PRIMARY KEY (customer_id),
    CONSTRAINT fk_dim_customer_location FOREIGN KEY (location_id)
        REFERENCES dim_location (location_id)
);
COMMENT ON TABLE dim_customer IS
    'Customers. Grain: one row per Customer_ID.';
COMMENT ON COLUMN dim_customer.customer_since_original IS
    'Original Customer_Since value before the data-cleaning correction that '
    'ensured Customer_Since <= the customer''s earliest Order_Date.';
COMMENT ON COLUMN dim_customer.customer_since_corrected_flag IS
    'True if customer_since was moved earlier during cleaning because it '
    'postdated the customer''s first recorded order.';

CREATE INDEX ix_dim_customer_location_id ON dim_customer (location_id);

-- ---------------------------------------------------------------------------
-- dim_warehouse  (FK -> dim_location)
-- Grain: one row per warehouse. 5 rows in data/cleaned/.
-- ---------------------------------------------------------------------------
CREATE TABLE dim_warehouse (
    warehouse_id        VARCHAR(10)     NOT NULL,
    warehouse_name       VARCHAR(100)    NOT NULL,
    location_id          VARCHAR(10)     NOT NULL,
    capacity_units        INTEGER         NOT NULL,
    warehouse_type        VARCHAR(20)     NOT NULL,
    CONSTRAINT pk_dim_warehouse PRIMARY KEY (warehouse_id),
    CONSTRAINT fk_dim_warehouse_location FOREIGN KEY (location_id)
        REFERENCES dim_location (location_id),
    CONSTRAINT ck_dim_warehouse_capacity_positive CHECK (capacity_units > 0)
);
COMMENT ON TABLE dim_warehouse IS
    'Warehouses. Grain: one row per Warehouse_ID.';

-- ---------------------------------------------------------------------------
-- dim_product  (FK -> dim_supplier)
-- Grain: one row per product. 40 rows in data/cleaned/.
-- ---------------------------------------------------------------------------
CREATE TABLE dim_product (
    product_id              VARCHAR(10)     NOT NULL,
    product_name            VARCHAR(100)    NOT NULL,
    category                VARCHAR(30)     NOT NULL,
    subcategory              VARCHAR(30)     NOT NULL,
    brand                    VARCHAR(30)     NOT NULL,
    unit_cost                NUMERIC(10,2)   NOT NULL,
    selling_price             NUMERIC(10,2)   NOT NULL,
    primary_supplier_id        VARCHAR(10)     NOT NULL,
    product_status             VARCHAR(20)     NOT NULL,
    CONSTRAINT pk_dim_product PRIMARY KEY (product_id),
    CONSTRAINT fk_dim_product_supplier FOREIGN KEY (primary_supplier_id)
        REFERENCES dim_supplier (supplier_id),
    CONSTRAINT ck_dim_product_cost_nonneg CHECK (unit_cost >= 0),
    CONSTRAINT ck_dim_product_price_nonneg CHECK (selling_price >= 0)
);
COMMENT ON TABLE dim_product IS
    'Products. Grain: one row per Product_ID.';
COMMENT ON COLUMN dim_product.product_status IS
    'Constant ("Active") for all 40 rows in the current dataset — no '
    'discontinued products are represented. Column retained as-is per the '
    'approved cleaning plan; see schema report, assumption 4.';

-- =============================================================================
-- FACT TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- fact_sales
-- Grain: one row per sales order line (Order_ID). 143,495 rows.
-- Verified: Order_ID is unique (143,495 distinct values across 143,495 rows) —
-- used directly as the primary key, per the required verification step.
-- ---------------------------------------------------------------------------
CREATE TABLE fact_sales (
    order_id             VARCHAR(20)     NOT NULL,
    date_id              INTEGER         NOT NULL,
    order_date           DATE            NOT NULL,
    product_id           VARCHAR(10)     NOT NULL,
    customer_id          VARCHAR(10)     NOT NULL,
    warehouse_id         VARCHAR(10)     NOT NULL,
    quantity             INTEGER         NOT NULL,
    unit_price            NUMERIC(10,2)   NOT NULL,
    discount_rate          NUMERIC(5,4)    NOT NULL,
    sales_value            NUMERIC(12,2)   NOT NULL,
    sales_outlier_flag       BOOLEAN         NOT NULL,
    CONSTRAINT pk_fact_sales PRIMARY KEY (order_id),
    CONSTRAINT fk_fact_sales_date FOREIGN KEY (date_id)
        REFERENCES dim_date (date_id),
    CONSTRAINT fk_fact_sales_product FOREIGN KEY (product_id)
        REFERENCES dim_product (product_id),
    CONSTRAINT fk_fact_sales_customer FOREIGN KEY (customer_id)
        REFERENCES dim_customer (customer_id),
    CONSTRAINT fk_fact_sales_warehouse FOREIGN KEY (warehouse_id)
        REFERENCES dim_warehouse (warehouse_id),
    CONSTRAINT ck_fact_sales_quantity_positive CHECK (quantity > 0),
    CONSTRAINT ck_fact_sales_unit_price_nonneg CHECK (unit_price >= 0),
    CONSTRAINT ck_fact_sales_discount_rate_range CHECK (discount_rate BETWEEN 0 AND 1)
);
COMMENT ON TABLE fact_sales IS
    'Sales order lines. Grain: one row per Order_ID (verified unique — used as '
    'the primary key rather than a surrogate).';
COMMENT ON COLUMN fact_sales.sales_outlier_flag IS
    'True where Sales_Value falls outside a 3x-IQR fence on the full '
    'distribution. Sales_Value itself is never altered; this flags rows for '
    'optional analytical exclusion. See schema report, assumption 5.';

CREATE INDEX ix_fact_sales_date_id ON fact_sales (date_id);
CREATE INDEX ix_fact_sales_product_id ON fact_sales (product_id);
CREATE INDEX ix_fact_sales_customer_id ON fact_sales (customer_id);
CREATE INDEX ix_fact_sales_warehouse_id ON fact_sales (warehouse_id);
CREATE INDEX ix_fact_sales_order_date ON fact_sales (order_date);
CREATE INDEX ix_fact_sales_outlier_flag ON fact_sales (sales_outlier_flag) WHERE sales_outlier_flag;

-- ---------------------------------------------------------------------------
-- fact_inventory
-- Grain: one row per (Date_ID, Product_ID, Warehouse_ID) — a daily inventory
-- snapshot per product per warehouse. 146,200 rows.
-- Verified: the (Date_ID, Product_ID, Warehouse_ID) combination is unique
-- across all 146,200 rows — used directly as the composite primary key, per
-- the required verification step.
-- ---------------------------------------------------------------------------
CREATE TABLE fact_inventory (
    date_id                   INTEGER         NOT NULL,
    inventory_date            DATE            NOT NULL,
    product_id                VARCHAR(10)     NOT NULL,
    warehouse_id               VARCHAR(10)     NOT NULL,
    opening_stock               INTEGER         NOT NULL,
    received_qty                 INTEGER         NOT NULL,
    sold_qty                     INTEGER         NOT NULL,
    damaged_qty                   INTEGER         NOT NULL,
    closing_stock                 INTEGER         NOT NULL,
    inventory_value                NUMERIC(14,2)   NOT NULL,
    stockout_flag                   BOOLEAN         NOT NULL,
    stockout_shortfall_units          INTEGER         NOT NULL,
    CONSTRAINT pk_fact_inventory PRIMARY KEY (date_id, product_id, warehouse_id),
    CONSTRAINT fk_fact_inventory_date FOREIGN KEY (date_id)
        REFERENCES dim_date (date_id),
    CONSTRAINT fk_fact_inventory_product FOREIGN KEY (product_id)
        REFERENCES dim_product (product_id),
    CONSTRAINT fk_fact_inventory_warehouse FOREIGN KEY (warehouse_id)
        REFERENCES dim_warehouse (warehouse_id),
    CONSTRAINT ck_fact_inventory_opening_nonneg CHECK (opening_stock >= 0),
    CONSTRAINT ck_fact_inventory_received_nonneg CHECK (received_qty >= 0),
    CONSTRAINT ck_fact_inventory_sold_nonneg CHECK (sold_qty >= 0),
    CONSTRAINT ck_fact_inventory_damaged_nonneg CHECK (damaged_qty >= 0),
    CONSTRAINT ck_fact_inventory_closing_nonneg CHECK (closing_stock >= 0),
    CONSTRAINT ck_fact_inventory_shortfall_nonneg CHECK (stockout_shortfall_units >= 0)
);
COMMENT ON TABLE fact_inventory IS
    'Daily inventory snapshots. Grain: one row per (Date_ID, Product_ID, '
    'Warehouse_ID) — verified unique — used as a composite primary key.';
COMMENT ON COLUMN fact_inventory.stockout_flag IS
    'True where Opening_Stock + Received_Qty - Sold_Qty - Damaged_Qty < 0, '
    'i.e. demand (Sold_Qty) exceeded available stock. Closing_Stock is '
    'floored at 0 in these rows rather than going negative; the five source '
    'quantity columns are never modified. See schema report, assumption 2.';
COMMENT ON COLUMN fact_inventory.stockout_shortfall_units IS
    'abs(Opening_Stock + Received_Qty - Sold_Qty - Damaged_Qty) where that '
    'quantity is negative, otherwise 0. The true unmet-demand size behind '
    'stockout_flag.';

CREATE INDEX ix_fact_inventory_product_id ON fact_inventory (product_id);
CREATE INDEX ix_fact_inventory_warehouse_id ON fact_inventory (warehouse_id);
CREATE INDEX ix_fact_inventory_stockout_flag ON fact_inventory (stockout_flag) WHERE stockout_flag;

-- ---------------------------------------------------------------------------
-- fact_purchase_orders
-- Grain: one row per purchase order (PO_ID). 8,292 rows.
-- ---------------------------------------------------------------------------
CREATE TABLE fact_purchase_orders (
    po_id                       VARCHAR(20)     NOT NULL,
    supplier_id                 VARCHAR(10)     NOT NULL,
    product_id                  VARCHAR(10)     NOT NULL,
    warehouse_id                 VARCHAR(10)     NOT NULL,
    order_date                   DATE            NOT NULL,
    expected_delivery_date         DATE            NOT NULL,
    actual_delivery_date            DATE            NOT NULL,
    ordered_qty                      INTEGER         NOT NULL,
    received_qty                      INTEGER         NOT NULL,
    unit_cost                          NUMERIC(10,2)   NOT NULL,
    po_value                            NUMERIC(14,2)   NOT NULL,
    CONSTRAINT pk_fact_purchase_orders PRIMARY KEY (po_id),
    CONSTRAINT fk_fact_po_supplier FOREIGN KEY (supplier_id)
        REFERENCES dim_supplier (supplier_id),
    CONSTRAINT fk_fact_po_product FOREIGN KEY (product_id)
        REFERENCES dim_product (product_id),
    CONSTRAINT fk_fact_po_warehouse FOREIGN KEY (warehouse_id)
        REFERENCES dim_warehouse (warehouse_id),
    CONSTRAINT ck_fact_po_ordered_qty_positive CHECK (ordered_qty > 0),
    CONSTRAINT ck_fact_po_received_qty_nonneg CHECK (received_qty >= 0),
    CONSTRAINT ck_fact_po_dates_order_before_expected CHECK (order_date <= expected_delivery_date),
    CONSTRAINT ck_fact_po_dates_order_before_actual CHECK (order_date <= actual_delivery_date)
);
COMMENT ON TABLE fact_purchase_orders IS
    'Purchase orders placed with suppliers. Grain: one row per PO_ID. '
    'Not linked to dim_date: this table stores plain DATE values and its '
    'delivery dates extend past dim_date''s 2025-12-31 upper bound — see '
    'schema report, assumption 1.';
COMMENT ON COLUMN fact_purchase_orders.po_value IS
    'Priced on Ordered_Qty x Unit_Cost, not Received_Qty x Unit_Cost — i.e. '
    'this is the value ordered, not the value actually received into '
    'inventory. See schema report, assumption 6.';

CREATE INDEX ix_fact_po_supplier_id ON fact_purchase_orders (supplier_id);
CREATE INDEX ix_fact_po_product_id ON fact_purchase_orders (product_id);
CREATE INDEX ix_fact_po_warehouse_id ON fact_purchase_orders (warehouse_id);
CREATE INDEX ix_fact_po_order_date ON fact_purchase_orders (order_date);

-- ---------------------------------------------------------------------------
-- fact_shipments
-- Grain: one row per shipment (Shipment_ID), currently one shipment per sales
-- order. 143,495 rows.
-- Verified: Order_ID is unique within fact_shipments (1:1 with fact_sales in
-- the current data) — enforced with a UNIQUE constraint in addition to the FK.
-- ---------------------------------------------------------------------------
CREATE TABLE fact_shipments (
    shipment_id                  VARCHAR(20)     NOT NULL,
    order_id                     VARCHAR(20)     NOT NULL,
    warehouse_id                  VARCHAR(10)     NOT NULL,
    carrier_id                     VARCHAR(10)     NOT NULL,
    dispatch_date                   DATE            NOT NULL,
    expected_delivery_date            DATE            NOT NULL,
    actual_delivery_date               DATE            NOT NULL,
    distance_km                         NUMERIC(8,1)    NOT NULL,
    shipping_cost                         NUMERIC(10,2)   NOT NULL,
    delivery_status                        VARCHAR(20)     NOT NULL,
    CONSTRAINT pk_fact_shipments PRIMARY KEY (shipment_id),
    CONSTRAINT uq_fact_shipments_order_id UNIQUE (order_id),
    CONSTRAINT fk_fact_shipments_order FOREIGN KEY (order_id)
        REFERENCES fact_sales (order_id),
    CONSTRAINT fk_fact_shipments_warehouse FOREIGN KEY (warehouse_id)
        REFERENCES dim_warehouse (warehouse_id),
    CONSTRAINT fk_fact_shipments_carrier FOREIGN KEY (carrier_id)
        REFERENCES dim_carrier (carrier_id),
    CONSTRAINT ck_fact_shipments_distance_positive CHECK (distance_km > 0),
    CONSTRAINT ck_fact_shipments_cost_nonneg CHECK (shipping_cost >= 0),
    CONSTRAINT ck_fact_shipments_dates_dispatch_before_actual CHECK (dispatch_date <= actual_delivery_date)
);
COMMENT ON TABLE fact_shipments IS
    'Shipments fulfilling sales orders. Grain: one row per Shipment_ID. '
    'Order_ID is unique in the current data (one shipment per order) and is '
    'enforced with a UNIQUE constraint — see schema report, assumption 7, '
    'for the caveat if partial/split shipments are introduced later.';

CREATE INDEX ix_fact_shipments_warehouse_id ON fact_shipments (warehouse_id);
CREATE INDEX ix_fact_shipments_carrier_id ON fact_shipments (carrier_id);
CREATE INDEX ix_fact_shipments_dispatch_date ON fact_shipments (dispatch_date);
CREATE INDEX ix_fact_shipments_delivery_status ON fact_shipments (delivery_status);

-- ---------------------------------------------------------------------------
-- fact_returns
-- Grain: one row per return (Return_ID). 7,192 rows.
-- ---------------------------------------------------------------------------
CREATE TABLE fact_returns (
    return_id             VARCHAR(20)     NOT NULL,
    order_id               VARCHAR(20)     NOT NULL,
    product_id               VARCHAR(10)     NOT NULL,
    customer_id                VARCHAR(10)     NOT NULL,
    warehouse_id                 VARCHAR(10)     NOT NULL,
    return_date                   DATE            NOT NULL,
    returned_qty                    INTEGER         NOT NULL,
    return_reason                     VARCHAR(50)     NOT NULL,
    refund_value                        NUMERIC(10,2)   NOT NULL,
    CONSTRAINT pk_fact_returns PRIMARY KEY (return_id),
    CONSTRAINT fk_fact_returns_order FOREIGN KEY (order_id)
        REFERENCES fact_sales (order_id),
    CONSTRAINT fk_fact_returns_product FOREIGN KEY (product_id)
        REFERENCES dim_product (product_id),
    CONSTRAINT fk_fact_returns_customer FOREIGN KEY (customer_id)
        REFERENCES dim_customer (customer_id),
    CONSTRAINT fk_fact_returns_warehouse FOREIGN KEY (warehouse_id)
        REFERENCES dim_warehouse (warehouse_id),
    CONSTRAINT ck_fact_returns_qty_positive CHECK (returned_qty > 0),
    CONSTRAINT ck_fact_returns_refund_nonneg CHECK (refund_value >= 0)
);
COMMENT ON TABLE fact_returns IS
    'Product returns against sales orders. Grain: one row per Return_ID. '
    'Order_ID happens to be unique in the current data (one return per '
    'order) but is NOT given a UNIQUE constraint, since a real returns '
    'process can plausibly allow multiple partial returns per order — see '
    'schema report, assumption 8.';

CREATE INDEX ix_fact_returns_order_id ON fact_returns (order_id);
CREATE INDEX ix_fact_returns_product_id ON fact_returns (product_id);
CREATE INDEX ix_fact_returns_customer_id ON fact_returns (customer_id);
CREATE INDEX ix_fact_returns_return_date ON fact_returns (return_date);

COMMIT;
