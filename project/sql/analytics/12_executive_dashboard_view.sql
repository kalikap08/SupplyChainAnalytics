CREATE OR REPLACE VIEW vw_executive_dashboard AS

SELECT

    -- ========================================================
    -- SALES
    -- ========================================================

    (
        SELECT COUNT(DISTINCT order_id)
        FROM fact_sales
    ) AS total_orders,

    (
        SELECT SUM(quantity)
        FROM fact_sales
    ) AS total_units_sold,

    (
        SELECT ROUND(SUM(sales_value), 2)
        FROM fact_sales
    ) AS total_revenue,


    -- ========================================================
    -- PROCUREMENT
    -- ========================================================

    (
        SELECT COUNT(DISTINCT po_id)
        FROM fact_purchase_orders
    ) AS total_purchase_orders,

    (
        SELECT ROUND(SUM(po_value), 2)
        FROM fact_purchase_orders
    ) AS total_procurement_value,

    (
        SELECT ROUND(
            100.0 * SUM(received_qty)
            / NULLIF(SUM(ordered_qty), 0),
            2
        )
        FROM fact_purchase_orders
    ) AS supplier_fill_rate_percent,


    -- ========================================================
    -- INVENTORY
    -- ========================================================

    (
        SELECT ROUND(SUM(inventory_value), 2)
        FROM fact_inventory
    ) AS total_inventory_value,

    (
        SELECT SUM(closing_stock)
        FROM fact_inventory
    ) AS total_closing_stock,

    (
        SELECT COUNT(*)
        FROM fact_inventory
        WHERE stockout_flag = TRUE
    ) AS stockout_records,


    -- ========================================================
    -- LOGISTICS
    -- ========================================================

    (
        SELECT COUNT(DISTINCT shipment_id)
        FROM fact_shipments
    ) AS total_shipments,

    (
        SELECT ROUND(SUM(shipping_cost), 2)
        FROM fact_shipments
    ) AS total_shipping_cost,

    (
        SELECT ROUND(
            100.0 *
            COUNT(*) FILTER (
                WHERE actual_delivery_date
                      <= expected_delivery_date
            )
            / NULLIF(COUNT(*), 0),
            2
        )
        FROM fact_shipments
        WHERE actual_delivery_date IS NOT NULL
    ) AS on_time_delivery_percent,


    -- ========================================================
    -- RETURNS
    -- ========================================================

    (
        SELECT COUNT(DISTINCT return_id)
        FROM fact_returns
    ) AS total_returns,

    (
        SELECT SUM(returned_qty)
        FROM fact_returns
    ) AS total_returned_units,

    (
        SELECT ROUND(SUM(refund_value), 2)
        FROM fact_returns
    ) AS total_refund_value,

    (
        SELECT ROUND(
            100.0 *
            COUNT(DISTINCT return_id)
            / NULLIF(
                (
                    SELECT COUNT(DISTINCT order_id)
                    FROM fact_sales
                ),
                0
            ),
            2
        )
        FROM fact_returns
    ) AS return_rate_percent;