-- ============================================================
-- SUPPLY CHAIN ANALYTICS
-- MASTER DATABASE VALIDATION
-- ============================================================
--
-- Purpose:
--   Validate that the PostgreSQL database contains the expected
--   data, relationships, calculations, and derived flags.
--
-- Expected result:
--   Every check should show:
--
--       status = PASS
--
-- IMPORTANT:
--   Stockout and sales-outlier rows are NOT expected to be zero.
--   We validate that their derived flags are calculated correctly.
--
-- PO VALUE:
--   Full-dataset investigation found that:
--
--       po_value ≈ ordered_qty * unit_cost
--
--   with observed differences from -2.02 to +1.93.
--   Therefore a ±2.05 tolerance is used.
--
-- ============================================================


WITH checks AS (

    -- ========================================================
    -- 1. ROW COUNT VALIDATION
    -- ========================================================

    SELECT
        'dim_date row count' AS check_name,
        731::bigint AS expected,
        COUNT(*)::bigint AS actual
    FROM dim_date

    UNION ALL

    SELECT
        'dim_product row count',
        40,
        COUNT(*)
    FROM dim_product

    UNION ALL

    SELECT
        'dim_customer row count',
        1000,
        COUNT(*)
    FROM dim_customer

    UNION ALL

    SELECT
        'dim_supplier row count',
        12,
        COUNT(*)
    FROM dim_supplier

    UNION ALL

    SELECT
        'dim_warehouse row count',
        5,
        COUNT(*)
    FROM dim_warehouse

    UNION ALL

    SELECT
        'dim_location row count',
        6,
        COUNT(*)
    FROM dim_location

    UNION ALL

    SELECT
        'dim_carrier row count',
        6,
        COUNT(*)
    FROM dim_carrier

    UNION ALL

    SELECT
        'fact_sales row count',
        143495,
        COUNT(*)
    FROM fact_sales

    UNION ALL

    SELECT
        'fact_inventory row count',
        146200,
        COUNT(*)
    FROM fact_inventory

    UNION ALL

    SELECT
        'fact_purchase_orders row count',
        8292,
        COUNT(*)
    FROM fact_purchase_orders

    UNION ALL

    SELECT
        'fact_shipments row count',
        143495,
        COUNT(*)
    FROM fact_shipments

    UNION ALL

    SELECT
        'fact_returns row count',
        7192,
        COUNT(*)
    FROM fact_returns


    -- ========================================================
    -- 2. PRIMARY KEY / GRAIN VALIDATION
    -- ========================================================

    UNION ALL

    SELECT
        'fact_sales duplicate order_id',
        0,
        COUNT(*)
    FROM (
        SELECT
            order_id
        FROM fact_sales
        GROUP BY order_id
        HAVING COUNT(*) > 1
    ) duplicates

    UNION ALL

    SELECT
        'fact_inventory duplicate grain',
        0,
        COUNT(*)
    FROM (
        SELECT
            date_id,
            product_id,
            warehouse_id
        FROM fact_inventory
        GROUP BY
            date_id,
            product_id,
            warehouse_id
        HAVING COUNT(*) > 1
    ) duplicates


    -- ========================================================
    -- 3. FOREIGN KEY / ORPHAN VALIDATION
    -- ========================================================

    -- Sales → Product

    UNION ALL

    SELECT
        'sales → product orphan rows',
        0,
        COUNT(*)
    FROM fact_sales s
    LEFT JOIN dim_product p
        ON s.product_id = p.product_id
    WHERE p.product_id IS NULL


    -- Sales → Customer

    UNION ALL

    SELECT
        'sales → customer orphan rows',
        0,
        COUNT(*)
    FROM fact_sales s
    LEFT JOIN dim_customer c
        ON s.customer_id = c.customer_id
    WHERE c.customer_id IS NULL


    -- Sales → Warehouse

    UNION ALL

    SELECT
        'sales → warehouse orphan rows',
        0,
        COUNT(*)
    FROM fact_sales s
    LEFT JOIN dim_warehouse w
        ON s.warehouse_id = w.warehouse_id
    WHERE w.warehouse_id IS NULL


    -- Sales → Date

    UNION ALL

    SELECT
        'sales → date orphan rows',
        0,
        COUNT(*)
    FROM fact_sales s
    LEFT JOIN dim_date d
        ON s.date_id = d.date_id
    WHERE d.date_id IS NULL


    -- Inventory → Product

    UNION ALL

    SELECT
        'inventory → product orphan rows',
        0,
        COUNT(*)
    FROM fact_inventory i
    LEFT JOIN dim_product p
        ON i.product_id = p.product_id
    WHERE p.product_id IS NULL


    -- Inventory → Warehouse

    UNION ALL

    SELECT
        'inventory → warehouse orphan rows',
        0,
        COUNT(*)
    FROM fact_inventory i
    LEFT JOIN dim_warehouse w
        ON i.warehouse_id = w.warehouse_id
    WHERE w.warehouse_id IS NULL


    -- Inventory → Date

    UNION ALL

    SELECT
        'inventory → date orphan rows',
        0,
        COUNT(*)
    FROM fact_inventory i
    LEFT JOIN dim_date d
        ON i.date_id = d.date_id
    WHERE d.date_id IS NULL


    -- ========================================================
    -- 4. SALES VALUE VALIDATION
    -- ========================================================

    UNION ALL

    SELECT
        'sales value formula',
        0,
        COUNT(*)
    FROM fact_sales
    WHERE ABS(
        sales_value -
        (
            quantity
            * unit_price
            * (1 - discount_rate)
        )
    ) > 0.01


    -- ========================================================
    -- 5. INVENTORY VALUE VALIDATION
    -- ========================================================
    --
    -- unit_cost is stored in dim_product, not fact_inventory.
    --
    -- Formula:
    --
    -- inventory_value =
    --     closing_stock * product.unit_cost
    --
    -- ========================================================

    UNION ALL

    SELECT
        'inventory value formula',
        0,
        COUNT(*)
    FROM fact_inventory i
    JOIN dim_product p
        ON i.product_id = p.product_id
    WHERE ABS(
        i.inventory_value -
        (
            i.closing_stock
            * p.unit_cost
        )
    ) > 0.01


    -- ========================================================
    -- 6. PURCHASE ORDER VALUE VALIDATION
    -- ========================================================
    --
    -- Observed full-dataset tolerance:
    --
    -- Minimum difference = -2.02
    -- Maximum difference = +1.93
    --
    -- Therefore:
    --
    --   tolerance = ±2.05
    --
    -- We DO NOT modify the PO data.
    --
    -- ========================================================

    UNION ALL

    SELECT
        'purchase order value formula',
        0,
        COUNT(*)
    FROM fact_purchase_orders
    WHERE ABS(
        po_value -
        (
            ordered_qty
            * unit_cost
        )
    ) > 2.05


    -- ========================================================
    -- 7. STOCKOUT FLAG VALIDATION
    -- ========================================================
    --
    -- A stockout is flagged when available inventory
    -- would become negative:
    --
    -- Opening Stock
    -- + Received Qty
    -- - Sold Qty
    -- - Damaged Qty
    -- < 0
    --
    -- ========================================================

    UNION ALL

    SELECT
        'stockout flag correctness',
        0,
        COUNT(*)
    FROM fact_inventory
    WHERE stockout_flag <>
        (
            opening_stock
            + received_qty
            - sold_qty
            - damaged_qty
            < 0
        )


    -- ========================================================
    -- 8. STOCKOUT SHORTFALL VALIDATION
    -- ========================================================
    --
    -- Expected shortfall:
    --
    -- sold + damaged
    -- - opening stock
    -- - received
    --
    -- floored at zero.
    --
    -- ========================================================

    UNION ALL

    SELECT
        'stockout shortfall correctness',
        0,
        COUNT(*)
    FROM fact_inventory
    WHERE stockout_shortfall_units <>
        GREATEST(
            sold_qty
            + damaged_qty
            - opening_stock
            - received_qty,
            0
        )


    -- ========================================================
    -- 9. SALES OUTLIER FLAG VALIDATION
    -- ========================================================
    --
    -- Uses a 3 × IQR fence.
    --
    -- Lower = Q1 - 3 × IQR
    -- Upper = Q3 + 3 × IQR
    --
    -- ========================================================

    UNION ALL

    SELECT
        'sales outlier flag correctness',
        0,
        COUNT(*)
    FROM fact_sales s
    CROSS JOIN (
        SELECT
            percentile_cont(0.25)
                WITHIN GROUP (
                    ORDER BY sales_value
                ) AS q1,

            percentile_cont(0.75)
                WITHIN GROUP (
                    ORDER BY sales_value
                ) AS q3

        FROM fact_sales
    ) q

    WHERE s.sales_outlier_flag <>
        (
            s.sales_value <
                q.q1 - 3 * (q.q3 - q.q1)

            OR

            s.sales_value >
                q.q3 + 3 * (q.q3 - q.q1)
        )


    -- ========================================================
    -- 10. CUSTOMER DATE VALIDATION
    -- ========================================================
    --
    -- Customer_Since should not be later than the customer's
    -- earliest recorded order.
    --
    -- ========================================================

    UNION ALL

    SELECT
        'customer since before earliest order',
        0,
        COUNT(*)
    FROM dim_customer c

    JOIN (
        SELECT
            customer_id,
            MIN(order_date) AS earliest_order_date
        FROM fact_sales
        GROUP BY customer_id
    ) s

        ON c.customer_id = s.customer_id

    WHERE c.customer_since > s.earliest_order_date


    -- ========================================================
    -- 11. RETURNS → SALES VALIDATION
    -- ========================================================

    UNION ALL

    SELECT
        'returns without matching sales order',
        0,
        COUNT(*)
    FROM fact_returns r

    LEFT JOIN fact_sales s
        ON r.order_id = s.order_id

    WHERE s.order_id IS NULL


    -- ========================================================
    -- 12. SHIPMENTS → SALES VALIDATION
    -- ========================================================

    UNION ALL

    SELECT
        'shipments without matching sales order',
        0,
        COUNT(*)
    FROM fact_shipments sh

    LEFT JOIN fact_sales s
        ON sh.order_id = s.order_id

    WHERE s.order_id IS NULL


    -- ========================================================
    -- 13. NULL VALIDATION
    -- ========================================================

    UNION ALL

    SELECT
        'sales NULL order_id',
        0,
        COUNT(*)
    FROM fact_sales
    WHERE order_id IS NULL

    UNION ALL

    SELECT
        'inventory NULL product_id',
        0,
        COUNT(*)
    FROM fact_inventory
    WHERE product_id IS NULL
)


-- ============================================================
-- FINAL VALIDATION RESULT
-- ============================================================

SELECT
    check_name,
    expected,
    actual,

    CASE
        WHEN expected = actual
        THEN 'PASS'
        ELSE 'FAIL'
    END AS status

FROM checks

ORDER BY
    CASE
        WHEN expected <> actual
        THEN 0
        ELSE 1
    END,

    check_name;