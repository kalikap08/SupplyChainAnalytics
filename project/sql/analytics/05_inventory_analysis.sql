-- ============================================================
-- SUPPLY CHAIN ANALYTICS
-- INVENTORY ANALYSIS
-- ============================================================


-- ============================================================
-- 1. OVERALL INVENTORY HEALTH
-- ============================================================

SELECT
    ROUND(
        SUM(inventory_value),
        2
    ) AS total_inventory_value,

    SUM(closing_stock) AS total_closing_stock,

    SUM(received_qty) AS total_received_qty,

    SUM(sold_qty) AS total_sold_qty,

    SUM(damaged_qty) AS total_damaged_qty,

    SUM(stockout_shortfall_units)
        AS total_stockout_shortfall_units,

    COUNT(*) FILTER (
        WHERE stockout_flag = TRUE
    ) AS stockout_records,

    ROUND(
        100.0 *
        COUNT(*) FILTER (
            WHERE stockout_flag = TRUE
        )
        / NULLIF(COUNT(*), 0),
        2
    ) AS stockout_rate_percent

FROM fact_inventory;


-- ============================================================
-- 2. INVENTORY BY WAREHOUSE
-- ============================================================

SELECT
    i.warehouse_id,

    w.warehouse_name,

    w.warehouse_type,

    ROUND(
        SUM(i.inventory_value),
        2
    ) AS inventory_value,

    SUM(i.closing_stock) AS closing_stock,

    SUM(i.received_qty) AS received_qty,

    SUM(i.sold_qty) AS sold_qty,

    SUM(i.damaged_qty) AS damaged_qty,

    COUNT(*) FILTER (
        WHERE i.stockout_flag = TRUE
    ) AS stockout_records,

    SUM(i.stockout_shortfall_units)
        AS stockout_shortfall_units,

    ROUND(
        100.0 *
        COUNT(*) FILTER (
            WHERE i.stockout_flag = TRUE
        )
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

ORDER BY
    inventory_value DESC;


-- ============================================================
-- 3. INVENTORY BY PRODUCT
-- ============================================================

SELECT
    i.product_id,

    p.product_name,

    p.category,

    p.subcategory,

    p.brand,

    ROUND(
        SUM(i.inventory_value),
        2
    ) AS inventory_value,

    SUM(i.closing_stock) AS closing_stock,

    SUM(i.sold_qty) AS units_sold,

    SUM(i.received_qty) AS units_received,

    SUM(i.damaged_qty) AS damaged_units,

    COUNT(*) FILTER (
        WHERE i.stockout_flag = TRUE
    ) AS stockout_records,

    SUM(i.stockout_shortfall_units)
        AS stockout_shortfall_units,

    ROUND(
        100.0 *
        COUNT(*) FILTER (
            WHERE i.stockout_flag = TRUE
        )
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

ORDER BY
    inventory_value DESC;


-- ============================================================
-- 4. PRODUCTS WITH HIGHEST STOCKOUT RISK
-- ============================================================

SELECT
    i.product_id,

    p.product_name,

    p.category,

    COUNT(*) AS inventory_records,

    COUNT(*) FILTER (
        WHERE i.stockout_flag = TRUE
    ) AS stockout_records,

    ROUND(
        100.0 *
        COUNT(*) FILTER (
            WHERE i.stockout_flag = TRUE
        )
        / NULLIF(COUNT(*), 0),
        2
    ) AS stockout_rate_percent,

    SUM(i.stockout_shortfall_units)
        AS total_shortfall_units,

    SUM(i.sold_qty)
        AS total_units_sold

FROM fact_inventory i

LEFT JOIN dim_product p
    ON i.product_id = p.product_id

GROUP BY
    i.product_id,
    p.product_name,
    p.category

HAVING
    COUNT(*) FILTER (
        WHERE i.stockout_flag = TRUE
    ) > 0

ORDER BY
    stockout_rate_percent DESC,
    total_shortfall_units DESC;


-- ============================================================
-- 5. WAREHOUSES WITH HIGHEST STOCKOUT RISK
-- ============================================================

SELECT
    i.warehouse_id,

    w.warehouse_name,

    w.warehouse_type,

    COUNT(*) AS inventory_records,

    COUNT(*) FILTER (
        WHERE i.stockout_flag = TRUE
    ) AS stockout_records,

    ROUND(
        100.0 *
        COUNT(*) FILTER (
            WHERE i.stockout_flag = TRUE
        )
        / NULLIF(COUNT(*), 0),
        2
    ) AS stockout_rate_percent,

    SUM(i.stockout_shortfall_units)
        AS total_shortfall_units,

    SUM(i.sold_qty)
        AS total_units_sold

FROM fact_inventory i

LEFT JOIN dim_warehouse w
    ON i.warehouse_id = w.warehouse_id

GROUP BY
    i.warehouse_id,
    w.warehouse_name,
    w.warehouse_type

ORDER BY
    stockout_rate_percent DESC,
    total_shortfall_units DESC;


-- ============================================================
-- 6. INVENTORY VALUE BY PRODUCT
-- ============================================================

SELECT
    i.product_id,

    p.product_name,

    p.category,

    ROUND(
        SUM(i.inventory_value),
        2
    ) AS inventory_value,

    SUM(i.closing_stock) AS closing_stock,

    p.unit_cost,

    ROUND(
        SUM(i.closing_stock) * p.unit_cost,
        2
    ) AS calculated_inventory_value

FROM fact_inventory i

LEFT JOIN dim_product p
    ON i.product_id = p.product_id

GROUP BY
    i.product_id,
    p.product_name,
    p.category,
    p.unit_cost

ORDER BY
    inventory_value DESC;


-- ============================================================
-- 7. DAILY INVENTORY TREND
-- ============================================================

SELECT
    inventory_date,

    ROUND(
        SUM(inventory_value),
        2
    ) AS inventory_value,

    SUM(closing_stock) AS closing_stock,

    SUM(received_qty) AS received_qty,

    SUM(sold_qty) AS sold_qty,

    SUM(damaged_qty) AS damaged_qty,

    COUNT(*) FILTER (
        WHERE stockout_flag = TRUE
    ) AS stockout_records

FROM fact_inventory

GROUP BY
    inventory_date

ORDER BY
    inventory_date;