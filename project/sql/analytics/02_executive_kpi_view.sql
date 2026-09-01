-- ============================================================
-- SUPPLY CHAIN ANALYTICS
-- EXECUTIVE KPI VIEW
-- ============================================================

CREATE OR REPLACE VIEW vw_executive_kpis AS

WITH
sales_kpis AS (
    SELECT
        COUNT(DISTINCT order_id) AS total_orders,
        SUM(quantity) AS total_units_sold,
        ROUND(SUM(sales_value), 2) AS total_revenue,
        ROUND(
            SUM(sales_value)
            / NULLIF(COUNT(DISTINCT order_id), 0),
            2
        ) AS average_order_value
    FROM fact_sales
),

inventory_kpis AS (
    SELECT
        ROUND(SUM(inventory_value), 2) AS total_inventory_value,

        SUM(stockout_shortfall_units)
            AS total_stockout_units,

        ROUND(
            100.0 *
            SUM(
                CASE
                    WHEN stockout_flag THEN 1
                    ELSE 0
                END
            )
            / NULLIF(COUNT(*), 0),
            2
        ) AS stockout_rate_percent

    FROM fact_inventory
),

procurement_kpis AS (
    SELECT
        COUNT(DISTINCT po_id)
            AS total_purchase_orders,

        ROUND(SUM(po_value), 2)
            AS total_procurement_value,

        SUM(ordered_qty)
            AS total_ordered_quantity,

        SUM(received_qty)
            AS total_received_quantity,

        ROUND(
            100.0 *
            SUM(received_qty)
            / NULLIF(SUM(ordered_qty), 0),
            2
        ) AS supplier_fill_rate_percent

    FROM fact_purchase_orders
),

logistics_kpis AS (
    SELECT
        COUNT(DISTINCT shipment_id)
            AS total_shipments,

        COUNT(DISTINCT order_id)
            AS shipped_orders,

        COUNT(*) FILTER (
            WHERE actual_delivery_date
                  <= expected_delivery_date
        ) AS on_time_shipments,

        ROUND(
            100.0 *
            COUNT(*) FILTER (
                WHERE actual_delivery_date
                      <= expected_delivery_date
            )
            / NULLIF(COUNT(*), 0),
            2
        ) AS on_time_delivery_percent,

        ROUND(
            AVG(
                actual_delivery_date - dispatch_date
            ),
            2
        ) AS average_delivery_days,

        ROUND(
            SUM(shipping_cost),
            2
        ) AS total_shipping_cost,

        ROUND(
            SUM(distance_km),
            2
        ) AS total_distance_km

    FROM fact_shipments
),

returns_kpis AS (
    SELECT
        COUNT(DISTINCT return_id)
            AS total_returns,

        COUNT(DISTINCT order_id)
            AS orders_with_returns,

        SUM(returned_qty)
            AS total_returned_units,

        ROUND(
            SUM(refund_value),
            2
        ) AS total_refund_value,

        ROUND(
            100.0 *
            COUNT(DISTINCT order_id)
            / NULLIF(
                (
                    SELECT COUNT(DISTINCT order_id)
                    FROM fact_sales
                ),
                0
            ),
            2
        ) AS return_rate_percent

    FROM fact_returns
)

SELECT
    -- Sales
    s.total_orders,
    s.total_units_sold,
    s.total_revenue,
    s.average_order_value,

    -- Inventory
    i.total_inventory_value,
    i.total_stockout_units,
    i.stockout_rate_percent,

    -- Procurement
    p.total_purchase_orders,
    p.total_procurement_value,
    p.total_ordered_quantity,
    p.total_received_quantity,
    p.supplier_fill_rate_percent,

    -- Logistics
    l.total_shipments,
    l.shipped_orders,
    l.on_time_shipments,
    l.on_time_delivery_percent,
    l.average_delivery_days,
    l.total_shipping_cost,
    l.total_distance_km,

    -- Returns
    r.total_returns,
    r.orders_with_returns,
    r.total_returned_units,
    r.total_refund_value,
    r.return_rate_percent

FROM sales_kpis s
CROSS JOIN inventory_kpis i
CROSS JOIN procurement_kpis p
CROSS JOIN logistics_kpis l
CROSS JOIN returns_kpis r;