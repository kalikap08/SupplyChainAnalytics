-- ============================================================
-- RETURNS & REFUND ANALYTICS
-- ============================================================


-- ============================================================
-- 1. OVERALL RETURNS KPIs
-- ============================================================

SELECT
    COUNT(DISTINCT return_id) AS total_returns,

    COUNT(DISTINCT order_id) AS orders_with_returns,

    SUM(returned_qty) AS total_returned_units,

    ROUND(
        SUM(refund_value),
        2
    ) AS total_refund_value,

    ROUND(
        100.0 * COUNT(DISTINCT return_id)
        / NULLIF(
            (SELECT COUNT(DISTINCT order_id)
             FROM fact_sales),
            0
        ),
        2
    ) AS return_rate_percent,

    ROUND(
        AVG(refund_value),
        2
    ) AS average_refund_value

FROM fact_returns;


-- ============================================================
-- 2. RETURNS BY REASON
-- ============================================================

SELECT
    return_reason,

    COUNT(DISTINCT return_id)
        AS return_count,

    SUM(returned_qty)
        AS returned_units,

    ROUND(
        SUM(refund_value),
        2
    ) AS refund_value,

    ROUND(
        100.0 * COUNT(DISTINCT return_id)
        / NULLIF(
            (SELECT COUNT(DISTINCT return_id)
             FROM fact_returns),
            0
        ),
        2
    ) AS return_percentage

FROM fact_returns

GROUP BY
    return_reason

ORDER BY
    return_count DESC;


-- ============================================================
-- 3. RETURNS BY PRODUCT
-- ============================================================

SELECT
    r.product_id,

    p.product_name,

    p.category,

    p.subcategory,

    COUNT(DISTINCT r.return_id)
        AS return_count,

    SUM(r.returned_qty)
        AS returned_units,

    ROUND(
        SUM(r.refund_value),
        2
    ) AS refund_value

FROM fact_returns r

LEFT JOIN dim_product p
    ON r.product_id = p.product_id

GROUP BY
    r.product_id,
    p.product_name,
    p.category,
    p.subcategory

ORDER BY
    returned_units DESC;


-- ============================================================
-- 4. RETURNS BY WAREHOUSE
-- ============================================================

SELECT
    r.warehouse_id,

    w.warehouse_name,

    COUNT(DISTINCT r.return_id)
        AS return_count,

    SUM(r.returned_qty)
        AS returned_units,

    ROUND(
        SUM(r.refund_value),
        2
    ) AS refund_value

FROM fact_returns r

LEFT JOIN dim_warehouse w
    ON r.warehouse_id = w.warehouse_id

GROUP BY
    r.warehouse_id,
    w.warehouse_name

ORDER BY
    return_count DESC;


-- ============================================================
-- 5. RETURNS BY CUSTOMER
-- ============================================================

SELECT
    r.customer_id,

    COUNT(DISTINCT r.return_id)
        AS return_count,

    SUM(r.returned_qty)
        AS returned_units,

    ROUND(
        SUM(r.refund_value),
        2
    ) AS refund_value

FROM fact_returns r

GROUP BY
    r.customer_id

ORDER BY
    return_count DESC

LIMIT 20;


-- ============================================================
-- 6. MONTHLY RETURNS TREND
-- ============================================================

SELECT
    DATE_TRUNC(
        'month',
        return_date
    )::date AS month,

    COUNT(DISTINCT return_id)
        AS total_returns,

    SUM(returned_qty)
        AS returned_units,

    ROUND(
        SUM(refund_value),
        2
    ) AS refund_value

FROM fact_returns

GROUP BY
    DATE_TRUNC(
        'month',
        return_date
    )

ORDER BY
    month;


-- ============================================================
-- 7. HIGH-VALUE RETURNS
-- ============================================================

SELECT
    return_id,

    order_id,

    product_id,

    customer_id,

    warehouse_id,

    return_date,

    returned_qty,

    return_reason,

    refund_value

FROM fact_returns

ORDER BY
    refund_value DESC

LIMIT 20;