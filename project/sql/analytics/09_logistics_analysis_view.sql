-- ============================================================
-- LOGISTICS & DELIVERY ANALYTICS VIEW
-- ============================================================

CREATE OR REPLACE VIEW vw_logistics_analysis AS

WITH carrier_analysis AS (
    SELECT
        sh.carrier_id,

        COUNT(DISTINCT sh.shipment_id) AS total_shipments,

        ROUND(SUM(sh.shipping_cost), 2) AS total_shipping_cost,

        ROUND(AVG(sh.distance_km), 2) AS average_distance_km,

        ROUND(
            AVG(
                sh.actual_delivery_date - sh.dispatch_date
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

    GROUP BY sh.carrier_id
),

warehouse_analysis AS (
    SELECT
        sh.warehouse_id,

        w.warehouse_name,

        COUNT(DISTINCT sh.shipment_id) AS total_shipments,

        ROUND(SUM(sh.shipping_cost), 2) AS total_shipping_cost,

        ROUND(AVG(sh.distance_km), 2) AS average_distance_km,

        ROUND(
            AVG(
                sh.actual_delivery_date - sh.dispatch_date
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
)

SELECT
    'CARRIER'::text AS analysis_type,

    carrier_id AS analysis_key,

    carrier_id,
    NULL::text AS carrier_name,

    NULL::text AS warehouse_id,
    NULL::text AS warehouse_name,

    total_shipments,
    total_shipping_cost,
    average_distance_km,
    average_delivery_days,
    on_time_shipments,
    late_shipments,
    on_time_delivery_percent

FROM carrier_analysis

UNION ALL

SELECT
    'WAREHOUSE'::text AS analysis_type,

    warehouse_id AS analysis_key,

    NULL::text AS carrier_id,
    NULL::text AS carrier_name,

    warehouse_id,
    warehouse_name,

    total_shipments,
    total_shipping_cost,
    average_distance_km,
    average_delivery_days,
    on_time_shipments,
    late_shipments,
    on_time_delivery_percent

FROM warehouse_analysis;