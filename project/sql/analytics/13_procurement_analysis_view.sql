-- ============================================================
-- PROCUREMENT ANALYTICS VIEW
-- ============================================================
-- Reconstructed to match the live vw_procurement_analysis that the API and
-- frontend (ProcurementRow) already depend on — this view existed in the
-- database but had no corresponding creation script checked into sql/.
-- Grain: one row per purchase order (PO_ID), matching fact_purchase_orders.

CREATE OR REPLACE VIEW vw_procurement_analysis AS

SELECT
    po.po_id,
    po.supplier_id,
    po.product_id,
    po.warehouse_id,
    po.order_date,
    po.expected_delivery_date,
    po.actual_delivery_date,

    po.ordered_qty,
    po.received_qty,
    po.ordered_qty - po.received_qty
        AS outstanding_qty,

    po.unit_cost,
    po.po_value,

    ROUND(po.ordered_qty * po.unit_cost, 2)
        AS calculated_po_value,

    ROUND(po.po_value - (po.ordered_qty * po.unit_cost), 2)
        AS po_value_difference,

    ROUND(
        100.0 * po.received_qty
        / NULLIF(po.ordered_qty, 0),
        2
    ) AS fill_rate_percent,

    (po.actual_delivery_date - po.order_date)
        AS delivery_days,

    (po.expected_delivery_date - po.order_date)
        AS expected_delivery_days,

    GREATEST(po.actual_delivery_date - po.expected_delivery_date, 0)
        AS delivery_delay_days,

    CASE
        WHEN po.actual_delivery_date <= po.expected_delivery_date
        THEN 'ON_TIME'
        ELSE 'LATE'
    END AS delivery_status

FROM fact_purchase_orders po;
