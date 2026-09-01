-- ============================================================
-- RETURNS & REFUND ANALYTICS VIEW
-- ============================================================

CREATE OR REPLACE VIEW vw_returns_analysis AS

-- ============================================================
-- PRODUCT LEVEL
-- ============================================================

SELECT
    'PRODUCT'::text AS analysis_type,

    r.product_id AS analysis_key,

    r.product_id,
    p.product_name,
    p.category,
    p.subcategory,

    NULL::text AS warehouse_id,
    NULL::text AS warehouse_name,

    NULL::text AS return_reason,

    COUNT(DISTINCT r.return_id) AS return_count,
    SUM(r.returned_qty) AS returned_units,
    ROUND(SUM(r.refund_value), 2) AS refund_value

FROM fact_returns r

LEFT JOIN dim_product p
    ON r.product_id = p.product_id

GROUP BY
    r.product_id,
    p.product_name,
    p.category,
    p.subcategory


UNION ALL


-- ============================================================
-- WAREHOUSE LEVEL
-- ============================================================

SELECT
    'WAREHOUSE'::text AS analysis_type,

    r.warehouse_id AS analysis_key,

    NULL::text AS product_id,
    NULL::text AS product_name,
    NULL::text AS category,
    NULL::text AS subcategory,

    r.warehouse_id,
    w.warehouse_name,

    NULL::text AS return_reason,

    COUNT(DISTINCT r.return_id) AS return_count,
    SUM(r.returned_qty) AS returned_units,
    ROUND(SUM(r.refund_value), 2) AS refund_value

FROM fact_returns r

LEFT JOIN dim_warehouse w
    ON r.warehouse_id = w.warehouse_id

GROUP BY
    r.warehouse_id,
    w.warehouse_name


UNION ALL


-- ============================================================
-- RETURN REASON LEVEL
-- ============================================================

SELECT
    'REASON'::text AS analysis_type,

    r.return_reason AS analysis_key,

    NULL::text AS product_id,
    NULL::text AS product_name,
    NULL::text AS category,
    NULL::text AS subcategory,

    NULL::text AS warehouse_id,
    NULL::text AS warehouse_name,

    r.return_reason,

    COUNT(DISTINCT r.return_id) AS return_count,
    SUM(r.returned_qty) AS returned_units,
    ROUND(SUM(r.refund_value), 2) AS refund_value

FROM fact_returns r

GROUP BY
    r.return_reason;