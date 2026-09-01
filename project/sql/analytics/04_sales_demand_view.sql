-- ============================================================
-- SALES & DEMAND ANALYTICS VIEW
-- ============================================================

CREATE OR REPLACE VIEW vw_sales_demand AS

WITH monthly_sales AS (

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

),

product_sales AS (

    SELECT
        s.product_id,

        p.product_name,

        p.category,

        p.subcategory,

        p.brand,

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
        p.product_name,
        p.category,
        p.subcategory,
        p.brand

),

warehouse_sales AS (

    SELECT
        s.warehouse_id,

        w.warehouse_name,

        w.warehouse_type,

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
        w.warehouse_name,
        w.warehouse_type

)

SELECT
    'MONTHLY' AS analysis_type,
    month::text AS analysis_key,

    NULL::text AS product_id,
    NULL::text AS product_name,
    NULL::text AS category,
    NULL::text AS subcategory,
    NULL::text AS brand,

    NULL::text AS warehouse_id,
    NULL::text AS warehouse_name,
    NULL::text AS warehouse_type,

    total_orders,
    units_sold,
    revenue,
    average_order_value

FROM monthly_sales

UNION ALL

SELECT
    'PRODUCT' AS analysis_type,
    product_id AS analysis_key,

    product_id,
    product_name,
    category,
    subcategory,
    brand,

    NULL::text,
    NULL::text,
    NULL::text,

    orders AS total_orders,
    units_sold,
    revenue,
    average_order_value

FROM product_sales

UNION ALL

SELECT
    'WAREHOUSE' AS analysis_type,
    warehouse_id AS analysis_key,

    NULL::text,
    NULL::text,
    NULL::text,
    NULL::text,
    NULL::text,

    warehouse_id,
    warehouse_name,
    warehouse_type,

    total_orders,
    units_sold,
    revenue,
    average_order_value

FROM warehouse_sales;