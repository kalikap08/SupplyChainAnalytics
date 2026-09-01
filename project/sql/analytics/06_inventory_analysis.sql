CREATE OR REPLACE VIEW vw_inventory_analysis AS

WITH product_inventory AS (
    SELECT
        i.product_id,
        p.product_name,
        p.category,
        p.subcategory,
        p.brand,

        ROUND(SUM(i.inventory_value), 2) AS inventory_value,
        SUM(i.closing_stock) AS closing_stock,
        SUM(i.received_qty) AS received_qty,
        SUM(i.sold_qty) AS sold_qty,
        SUM(i.damaged_qty) AS damaged_qty,

        COUNT(*) FILTER (
            WHERE i.stockout_flag = TRUE
        ) AS stockout_records,

        SUM(i.stockout_shortfall_units) AS stockout_shortfall_units,

        ROUND(
            100.0 *
            COUNT(*) FILTER (WHERE i.stockout_flag = TRUE)
            / NULLIF(COUNT(*), 0),
            2
        ) AS stockout_rate_percent

    FROM fact_inventory i

    LEFT JOIN dim_product p
        ON i.product_id = p.product_id

    GROUP BY
        i.product_id,
        p.product_name,
        p.category,
        p.subcategory,
        p.brand
),

warehouse_inventory AS (
    SELECT
        i.warehouse_id,
        w.warehouse_name,
        w.warehouse_type,

        ROUND(SUM(i.inventory_value), 2) AS inventory_value,
        SUM(i.closing_stock) AS closing_stock,
        SUM(i.received_qty) AS received_qty,
        SUM(i.sold_qty) AS sold_qty,
        SUM(i.damaged_qty) AS damaged_qty,

        COUNT(*) FILTER (
            WHERE i.stockout_flag = TRUE
        ) AS stockout_records,

        SUM(i.stockout_shortfall_units) AS stockout_shortfall_units,

        ROUND(
            100.0 *
            COUNT(*) FILTER (WHERE i.stockout_flag = TRUE)
            / NULLIF(COUNT(*), 0),
            2
        ) AS stockout_rate_percent

    FROM fact_inventory i

    LEFT JOIN dim_warehouse w
        ON i.warehouse_id = w.warehouse_id

    GROUP BY
        i.warehouse_id,
        w.warehouse_name,
        w.warehouse_type
)

SELECT
    'PRODUCT'::text AS analysis_type,

    product_id AS analysis_key,

    product_id,
    product_name,
    category,
    subcategory,
    brand,

    NULL::text AS warehouse_id,
    NULL::text AS warehouse_name,
    NULL::text AS warehouse_type,

    inventory_value,
    closing_stock,
    received_qty,
    sold_qty,
    damaged_qty,
    stockout_records,
    stockout_shortfall_units,
    stockout_rate_percent

FROM product_inventory

UNION ALL

SELECT
    'WAREHOUSE'::text AS analysis_type,

    warehouse_id AS analysis_key,

    NULL::text AS product_id,
    NULL::text AS product_name,
    NULL::text AS category,
    NULL::text AS subcategory,
    NULL::text AS brand,

    warehouse_id,
    warehouse_name,
    warehouse_type,

    inventory_value,
    closing_stock,
    received_qty,
    sold_qty,
    damaged_qty,
    stockout_records,
    stockout_shortfall_units,
    stockout_rate_percent

FROM warehouse_inventory;