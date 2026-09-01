-- ============================================================
-- SUPPLY CHAIN ANALYTICS
-- SALES & DEMAND ANALYSIS
-- ============================================================


-- ============================================================
-- 1. MONTHLY SALES PERFORMANCE
-- ============================================================

SELECT
    DATE_TRUNC('month', order_date)::date AS month,

    COUNT(DISTINCT order_id) AS total_orders,

    SUM(quantity) AS units_sold,

    ROUND(
        SUM(sales_value),
        2
    ) AS revenue,

    ROUND(
        SUM(sales_value)
        / NULLIF(COUNT(DISTINCT order_id), 0),
        2
    ) AS average_order_value

FROM fact_sales

GROUP BY
    DATE_TRUNC('month', order_date)

ORDER BY
    month;


-- ============================================================
-- 2. PRODUCT PERFORMANCE
-- ============================================================

SELECT
    s.product_id,

    p.product_name,

    SUM(s.quantity) AS units_sold,

    ROUND(
        SUM(s.sales_value),
        2
    ) AS revenue,

    COUNT(DISTINCT s.order_id) AS orders,

    ROUND(
        SUM(s.sales_value)
        / NULLIF(COUNT(DISTINCT s.order_id), 0),
        2
    ) AS average_order_value

FROM fact_sales s

LEFT JOIN dim_product p
    ON s.product_id = p.product_id

GROUP BY
    s.product_id,
    p.product_name

ORDER BY
    revenue DESC;


-- ============================================================
-- 3. WAREHOUSE PERFORMANCE
-- ============================================================

SELECT
    s.warehouse_id,

    w.warehouse_name,

    COUNT(DISTINCT s.order_id) AS total_orders,

    SUM(s.quantity) AS units_sold,

    ROUND(
        SUM(s.sales_value),
        2
    ) AS revenue,

    ROUND(
        SUM(s.sales_value)
        / NULLIF(COUNT(DISTINCT s.order_id), 0),
        2
    ) AS average_order_value

FROM fact_sales s

LEFT JOIN dim_warehouse w
    ON s.warehouse_id = w.warehouse_id

GROUP BY
    s.warehouse_id,
    w.warehouse_name

ORDER BY
    revenue DESC;


-- ============================================================
-- 4. TOP 10 PRODUCTS
-- ============================================================

SELECT
    s.product_id,

    p.product_name,

    SUM(s.quantity) AS units_sold,

    ROUND(
        SUM(s.sales_value),
        2
    ) AS revenue

FROM fact_sales s

LEFT JOIN dim_product p
    ON s.product_id = p.product_id

GROUP BY
    s.product_id,
    p.product_name

ORDER BY
    revenue DESC

LIMIT 10;


-- ============================================================
-- 5. BOTTOM 10 PRODUCTS
-- ============================================================

SELECT
    s.product_id,

    p.product_name,

    SUM(s.quantity) AS units_sold,

    ROUND(
        SUM(s.sales_value),
        2
    ) AS revenue

FROM fact_sales s

LEFT JOIN dim_product p
    ON s.product_id = p.product_id

GROUP BY
    s.product_id,
    p.product_name

ORDER BY
    revenue ASC

LIMIT 10;