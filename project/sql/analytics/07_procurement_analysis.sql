-- ============================================================
-- PROCUREMENT & SUPPLIER ANALYTICS
-- ============================================================


-- ============================================================
-- 1. OVERALL PROCUREMENT KPIs
-- ============================================================

SELECT
    COUNT(DISTINCT po_id) AS total_purchase_orders,

    ROUND(SUM(po_value), 2) AS total_procurement_value,

    SUM(ordered_qty) AS total_ordered_quantity,

    SUM(received_qty) AS total_received_quantity,

    SUM(ordered_qty - received_qty)
        AS outstanding_quantity,

    ROUND(
        100.0 * SUM(received_qty)
        / NULLIF(SUM(ordered_qty), 0),
        2
    ) AS supplier_fill_rate_percent,

    ROUND(
        AVG(po_value),
        2
    ) AS average_po_value

FROM fact_purchase_orders;


-- ============================================================
-- 2. SUPPLIER PERFORMANCE
-- ============================================================

SELECT
    po.supplier_id,

    s.supplier_name,

    COUNT(DISTINCT po.po_id)
        AS total_purchase_orders,

    ROUND(
        SUM(po.po_value),
        2
    ) AS procurement_value,

    SUM(po.ordered_qty)
        AS ordered_quantity,

    SUM(po.received_qty)
        AS received_quantity,

    SUM(po.ordered_qty - po.received_qty)
        AS outstanding_quantity,

    ROUND(
        100.0 * SUM(po.received_qty)
        / NULLIF(SUM(po.ordered_qty), 0),
        2
    ) AS fill_rate_percent

FROM fact_purchase_orders po

LEFT JOIN dim_supplier s
    ON po.supplier_id = s.supplier_id

GROUP BY
    po.supplier_id,
    s.supplier_name

ORDER BY
    procurement_value DESC;


-- ============================================================
-- 3. SUPPLIER DELIVERY PERFORMANCE
-- ============================================================

SELECT
    po.supplier_id,

    s.supplier_name,

    COUNT(DISTINCT po.po_id)
        AS total_purchase_orders,

    COUNT(*) FILTER (
        WHERE po.actual_delivery_date
              <= po.expected_delivery_date
    ) AS on_time_orders,

    COUNT(*) FILTER (
        WHERE po.actual_delivery_date
              > po.expected_delivery_date
    ) AS late_orders,

    ROUND(
        100.0 *
        COUNT(*) FILTER (
            WHERE po.actual_delivery_date
                  <= po.expected_delivery_date
        )
        / NULLIF(COUNT(*), 0),
        2
    ) AS on_time_delivery_percent,

    ROUND(
        AVG(
            CASE
                WHEN po.actual_delivery_date
                     > po.expected_delivery_date
                THEN
                    po.actual_delivery_date
                    - po.expected_delivery_date
            END
        ),
        2
    ) AS average_delay_days

FROM fact_purchase_orders po

LEFT JOIN dim_supplier s
    ON po.supplier_id = s.supplier_id

WHERE
    po.actual_delivery_date IS NOT NULL

GROUP BY
    po.supplier_id,
    s.supplier_name

ORDER BY
    on_time_delivery_percent ASC;


-- ============================================================
-- 4. MONTHLY PROCUREMENT TREND
-- ============================================================

SELECT
    DATE_TRUNC(
        'month',
        order_date
    )::date AS month,

    COUNT(DISTINCT po_id)
        AS purchase_orders,

    ROUND(
        SUM(po_value),
        2
    ) AS procurement_value,

    SUM(ordered_qty)
        AS ordered_quantity,

    SUM(received_qty)
        AS received_quantity,

    ROUND(
        100.0 * SUM(received_qty)
        / NULLIF(SUM(ordered_qty), 0),
        2
    ) AS fill_rate_percent

FROM fact_purchase_orders

GROUP BY
    DATE_TRUNC('month', order_date)

ORDER BY
    month;


-- ============================================================
-- 5. PRODUCT PROCUREMENT PERFORMANCE
-- ============================================================

SELECT
    po.product_id,

    p.product_name,

    p.category,

    COUNT(DISTINCT po.po_id)
        AS purchase_orders,

    ROUND(
        SUM(po.po_value),
        2
    ) AS procurement_value,

    SUM(po.ordered_qty)
        AS ordered_quantity,

    SUM(po.received_qty)
        AS received_quantity,

    SUM(po.ordered_qty - po.received_qty)
        AS outstanding_quantity,

    ROUND(
        100.0 * SUM(po.received_qty)
        / NULLIF(SUM(po.ordered_qty), 0),
        2
    ) AS fill_rate_percent

FROM fact_purchase_orders po

LEFT JOIN dim_product p
    ON po.product_id = p.product_id

GROUP BY
    po.product_id,
    p.product_name,
    p.category

ORDER BY
    procurement_value DESC;


-- ============================================================
-- 6. WAREHOUSE PROCUREMENT
-- ============================================================

SELECT
    po.warehouse_id,

    w.warehouse_name,

    COUNT(DISTINCT po.po_id)
        AS purchase_orders,

    ROUND(
        SUM(po.po_value),
        2
    ) AS procurement_value,

    SUM(po.ordered_qty)
        AS ordered_quantity,

    SUM(po.received_qty)
        AS received_quantity,

    SUM(po.ordered_qty - po.received_qty)
        AS outstanding_quantity,

    ROUND(
        100.0 * SUM(po.received_qty)
        / NULLIF(SUM(po.ordered_qty), 0),
        2
    ) AS fill_rate_percent

FROM fact_purchase_orders po

LEFT JOIN dim_warehouse w
    ON po.warehouse_id = w.warehouse_id

GROUP BY
    po.warehouse_id,
    w.warehouse_name

ORDER BY
    procurement_value DESC;