-- ============================================================
-- LOGISTICS & DELIVERY ANALYTICS
-- ============================================================


-- ============================================================
-- 1. OVERALL LOGISTICS KPIs
-- ============================================================

SELECT
    COUNT(DISTINCT shipment_id) AS total_shipments,

    COUNT(DISTINCT order_id) AS shipped_orders,

    SUM(distance_km) AS total_distance_km,

    ROUND(SUM(shipping_cost), 2) AS total_shipping_cost,

    ROUND(
        AVG(distance_km),
        2
    ) AS average_distance_km,

    ROUND(
        AVG(
            actual_delivery_date - dispatch_date
        ),
        2
    ) AS average_delivery_days,

    COUNT(*) FILTER (
        WHERE actual_delivery_date
              <= expected_delivery_date
    ) AS on_time_shipments,

    COUNT(*) FILTER (
        WHERE actual_delivery_date
              > expected_delivery_date
    ) AS late_shipments,

    ROUND(
        100.0 *
        COUNT(*) FILTER (
            WHERE actual_delivery_date
                  <= expected_delivery_date
        )
        / NULLIF(COUNT(*), 0),
        2
    ) AS on_time_delivery_percent

FROM fact_shipments
WHERE actual_delivery_date IS NOT NULL;


-- ============================================================
-- 2. CARRIER PERFORMANCE
-- ============================================================

SELECT
    sh.carrier_id,

    COUNT(DISTINCT sh.shipment_id)
        AS total_shipments,

    ROUND(
        SUM(sh.shipping_cost),
        2
    ) AS total_shipping_cost,

    ROUND(
        AVG(sh.distance_km),
        2
    ) AS average_distance_km,

    ROUND(
        AVG(
            sh.actual_delivery_date
            - sh.dispatch_date
        ),
        2
    ) AS average_delivery_days,

    COUNT(*) FILTER (
        WHERE sh.actual_delivery_date
              <= sh.expected_delivery_date
    ) AS on_time_shipments,

    COUNT(*) FILTER (
        WHERE sh.actual_delivery_date
              > sh.expected_delivery_date
    ) AS late_shipments,

    ROUND(
        100.0 *
        COUNT(*) FILTER (
            WHERE sh.actual_delivery_date
                  <= sh.expected_delivery_date
        )
        / NULLIF(COUNT(*), 0),
        2
    ) AS on_time_delivery_percent

FROM fact_shipments sh

WHERE sh.actual_delivery_date IS NOT NULL

GROUP BY
    sh.carrier_id

ORDER BY
    on_time_delivery_percent DESC;


-- ============================================================
-- 3. WAREHOUSE DELIVERY PERFORMANCE
-- ============================================================

SELECT
    sh.warehouse_id,

    w.warehouse_name,

    COUNT(DISTINCT sh.shipment_id)
        AS total_shipments,

    ROUND(
        SUM(sh.shipping_cost),
        2
    ) AS total_shipping_cost,

    ROUND(
        AVG(sh.distance_km),
        2
    ) AS average_distance_km,

    ROUND(
        AVG(
            sh.actual_delivery_date
            - sh.dispatch_date
        ),
        2
    ) AS average_delivery_days,

    COUNT(*) FILTER (
        WHERE sh.actual_delivery_date
              <= sh.expected_delivery_date
    ) AS on_time_shipments,

    COUNT(*) FILTER (
        WHERE sh.actual_delivery_date
              > sh.expected_delivery_date
    ) AS late_shipments,

    ROUND(
        100.0 *
        COUNT(*) FILTER (
            WHERE sh.actual_delivery_date
                  <= sh.expected_delivery_date
        )
        / NULLIF(COUNT(*), 0),
        2
    ) AS on_time_delivery_percent

FROM fact_shipments sh

LEFT JOIN dim_warehouse w
    ON sh.warehouse_id = w.warehouse_id

WHERE sh.actual_delivery_date IS NOT NULL

GROUP BY
    sh.warehouse_id,
    w.warehouse_name

ORDER BY
    on_time_delivery_percent DESC;


-- ============================================================
-- 4. MONTHLY LOGISTICS TREND
-- ============================================================

SELECT
    DATE_TRUNC(
        'month',
        dispatch_date
    )::date AS month,

    COUNT(DISTINCT shipment_id)
        AS total_shipments,

    ROUND(
        SUM(shipping_cost),
        2
    ) AS shipping_cost,

    ROUND(
        AVG(distance_km),
        2
    ) AS average_distance_km,

    ROUND(
        AVG(
            actual_delivery_date
            - dispatch_date
        ),
        2
    ) AS average_delivery_days,

    COUNT(*) FILTER (
        WHERE actual_delivery_date
              <= expected_delivery_date
    ) AS on_time_shipments,

    COUNT(*) FILTER (
        WHERE actual_delivery_date
              > expected_delivery_date
    ) AS late_shipments,

    ROUND(
        100.0 *
        COUNT(*) FILTER (
            WHERE actual_delivery_date
                  <= expected_delivery_date
        )
        / NULLIF(COUNT(*), 0),
        2
    ) AS on_time_delivery_percent

FROM fact_shipments

WHERE actual_delivery_date IS NOT NULL

GROUP BY
    DATE_TRUNC(
        'month',
        dispatch_date
    )

ORDER BY
    month;


-- ============================================================
-- 5. DELIVERY STATUS BREAKDOWN
-- ============================================================

SELECT
    delivery_status,

    COUNT(*) AS shipment_count,

    ROUND(
        100.0 * COUNT(*)
        / NULLIF(
            (SELECT COUNT(*) FROM fact_shipments),
            0
        ),
        2
    ) AS percentage_of_shipments

FROM fact_shipments

GROUP BY
    delivery_status

ORDER BY
    shipment_count DESC;


-- ============================================================
-- 6. DELAY ANALYSIS
-- ============================================================

SELECT
    shipment_id,

    order_id,

    warehouse_id,

    carrier_id,

    dispatch_date,

    expected_delivery_date,

    actual_delivery_date,

    (
        actual_delivery_date
        - expected_delivery_date
    ) AS delay_days,

    distance_km,

    shipping_cost,

    delivery_status

FROM fact_shipments

WHERE
    actual_delivery_date
    > expected_delivery_date

ORDER BY
    delay_days DESC;


-- ============================================================
-- 7. MOST EXPENSIVE SHIPMENTS
-- ============================================================

SELECT
    shipment_id,

    order_id,

    warehouse_id,

    carrier_id,

    distance_km,

    shipping_cost,

    ROUND(
        shipping_cost
        / NULLIF(distance_km, 0),
        2
    ) AS cost_per_km,

    dispatch_date,

    expected_delivery_date,

    actual_delivery_date,

    (
        actual_delivery_date
        - expected_delivery_date
    ) AS delay_days

FROM fact_shipments

WHERE distance_km > 0

ORDER BY
    shipping_cost DESC

LIMIT 20;