-- ============================================================
-- SUPPLY CHAIN ANALYTICS
-- EXECUTIVE KPIs
-- ============================================================

-- 1. SALES KPIs
-- ============================================================

SELECT
    COUNT(DISTINCT order_id) AS total_orders,
    SUM(quantity) AS total_units_sold,
    ROUND(SUM(sales_value), 2) AS total_revenue,
    ROUND(
        SUM(sales_value) / NULLIF(COUNT(DISTINCT order_id), 0),
        2
    ) AS average_order_value
FROM fact_sales;


-- 2. INVENTORY KPIs
-- ============================================================

SELECT
    ROUND(SUM(inventory_value), 2) AS total_inventory_value,

    SUM(stockout_shortfall_units) AS total_stockout_units,

    ROUND(
        100.0 * SUM(
            CASE
                WHEN stockout_flag THEN 1
                ELSE 0
            END
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS stockout_rate_percent

FROM fact_inventory;


-- 3. PROCUREMENT KPIs
-- ============================================================

SELECT
    COUNT(DISTINCT po_id) AS total_purchase_orders,

    ROUND(SUM(po_value), 2) AS total_procurement_value,

    SUM(ordered_qty) AS total_ordered_quantity,

    SUM(received_qty) AS total_received_quantity,

    ROUND(
        100.0 * SUM(received_qty)
        / NULLIF(SUM(ordered_qty), 0),
        2
    ) AS supplier_fill_rate_percent

FROM fact_purchase_orders;

-- ============================================================
-- 4. LOGISTICS KPIs
-- ============================================================

SELECT
    COUNT(DISTINCT shipment_id) AS total_shipments,

    COUNT(DISTINCT order_id) AS shipped_orders,

    COUNT(*) FILTER (
        WHERE actual_delivery_date <= expected_delivery_date
    ) AS on_time_shipments,

    ROUND(
        100.0 *
        COUNT(*) FILTER (
            WHERE actual_delivery_date <= expected_delivery_date
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

FROM fact_shipments;

-- ============================================================
-- 5. RETURNS KPIs
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
        100.0 *
        COUNT(DISTINCT order_id)
        / NULLIF(
            (SELECT COUNT(DISTINCT order_id)
             FROM fact_sales),
            0
        ),
        2
    ) AS return_rate_percent

FROM fact_returns;