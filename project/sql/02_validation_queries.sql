-- ============================================================
-- SUPPLY CHAIN ANALYTICS
-- DATABASE VALIDATION
-- ============================================================

-- ============================================================
-- 1. ROW COUNT VALIDATION
-- ============================================================

SELECT 'dim_date' AS table_name, COUNT(*) AS row_count
FROM dim_date

UNION ALL
SELECT 'dim_product', COUNT(*) FROM dim_product
UNION ALL
SELECT 'dim_customer', COUNT(*) FROM dim_customer
UNION ALL
SELECT 'dim_supplier', COUNT(*) FROM dim_supplier
UNION ALL
SELECT 'dim_warehouse', COUNT(*) FROM dim_warehouse
UNION ALL
SELECT 'dim_location', COUNT(*) FROM dim_location
UNION ALL
SELECT 'dim_carrier', COUNT(*) FROM dim_carrier
UNION ALL
SELECT 'fact_sales', COUNT(*) FROM fact_sales
UNION ALL
SELECT 'fact_inventory', COUNT(*) FROM fact_inventory
UNION ALL
SELECT 'fact_purchase_orders', COUNT(*) FROM fact_purchase_orders
UNION ALL
SELECT 'fact_shipments', COUNT(*) FROM fact_shipments
UNION ALL
SELECT 'fact_returns', COUNT(*) FROM fact_returns
ORDER BY table_name;


-- ============================================================
-- 2. PRIMARY KEY VALIDATION
-- ============================================================

-- Sales order IDs should be unique
SELECT
    'fact_sales duplicate order_id' AS check_name,
    COUNT(*) AS violations
FROM (
    SELECT order_id
    FROM fact_sales
    GROUP BY order_id
    HAVING COUNT(*) > 1
) duplicates;


-- Inventory grain should be unique
SELECT
    'fact_inventory duplicate grain' AS check_name,
    COUNT(*) AS violations
FROM (
    SELECT date_id, product_id, warehouse_id
    FROM fact_inventory
    GROUP BY date_id, product_id, warehouse_id
    HAVING COUNT(*) > 1
) duplicates;


-- ============================================================
-- 3. FOREIGN KEY VALIDATION
-- ============================================================

-- Sales → Product
SELECT
    'fact_sales → dim_product' AS check_name,
    COUNT(*) AS orphan_rows
FROM fact_sales s
LEFT JOIN dim_product p
    ON s.product_id = p.product_id
WHERE p.product_id IS NULL;


-- Sales → Customer
SELECT
    'fact_sales → dim_customer' AS check_name,
    COUNT(*) AS orphan_rows
FROM fact_sales s
LEFT JOIN dim_customer c
    ON s.customer_id = c.customer_id
WHERE c.customer_id IS NULL;


-- Sales → Warehouse
SELECT
    'fact_sales → dim_warehouse' AS check_name,
    COUNT(*) AS orphan_rows
FROM fact_sales s
LEFT JOIN dim_warehouse w
    ON s.warehouse_id = w.warehouse_id
WHERE w.warehouse_id IS NULL;


-- Sales → Date
SELECT
    'fact_sales → dim_date' AS check_name,
    COUNT(*) AS orphan_rows
FROM fact_sales s
LEFT JOIN dim_date d
    ON s.date_id = d.date_id
WHERE d.date_id IS NULL;


-- Inventory → Product
SELECT
    'fact_inventory → dim_product' AS check_name,
    COUNT(*) AS orphan_rows
FROM fact_inventory i
LEFT JOIN dim_product p
    ON i.product_id = p.product_id
WHERE p.product_id IS NULL;


-- Inventory → Warehouse
SELECT
    'fact_inventory → dim_warehouse' AS check_name,
    COUNT(*) AS orphan_rows
FROM fact_inventory i
LEFT JOIN dim_warehouse w
    ON i.warehouse_id = w.warehouse_id
WHERE w.warehouse_id IS NULL;


-- Inventory → Date
SELECT
    'fact_inventory → dim_date' AS check_name,
    COUNT(*) AS orphan_rows
FROM fact_inventory i
LEFT JOIN dim_date d
    ON i.date_id = d.date_id
WHERE d.date_id IS NULL;


-- ============================================================
-- 4. SALES VALUE VALIDATION
-- ============================================================

SELECT
    'Sales value calculation' AS check_name,
    COUNT(*) AS violations
FROM fact_sales
WHERE ABS(
    sales_value -
    (quantity * unit_price * (1 - discount_rate))
) > 0.01;


-- ============================================================
-- 5. INVENTORY VALUE VALIDATION
-- ============================================================

SELECT
    'Inventory value calculation' AS check_name,
    COUNT(*) AS violations
FROM fact_inventory
WHERE ABS(
    inventory_value -
    (closing_stock * unit_cost)
) > 0.01;


-- ============================================================
-- 6. PURCHASE ORDER VALUE VALIDATION
-- ============================================================

SELECT
    'PO value calculation' AS check_name,
    COUNT(*) AS violations
FROM fact_purchase_orders
WHERE ABS(
    po_value -
    (ordered_qty * unit_cost)
) > 0.01;


-- ============================================================
-- 7. STOCKOUT FLAG VALIDATION
-- ============================================================

SELECT
    'Stockout flag correctness' AS check_name,
    COUNT(*) AS violations
FROM fact_inventory
WHERE
    stockout_flag <>
    (
        opening_stock
        + received_qty
        - sold_qty
        - damaged_qty
        < 0
    );


-- ============================================================
-- 8. STOCKOUT SHORTFALL VALIDATION
-- ============================================================

SELECT
    'Stockout shortfall correctness' AS check_name,
    COUNT(*) AS violations
FROM fact_inventory
WHERE
    stockout_shortfall_units <>
    GREATEST(
        sold_qty
        + damaged_qty
        - opening_stock
        - received_qty,
        0
    );


-- ============================================================
-- 9. SALES OUTLIER FLAG VALIDATION
-- ============================================================

WITH quartiles AS (
    SELECT
        percentile_cont(0.25)
            WITHIN GROUP (ORDER BY sales_value) AS q1,
        percentile_cont(0.75)
            WITHIN GROUP (ORDER BY sales_value) AS q3
    FROM fact_sales
),
fence AS (
    SELECT
        q1,
        q3,
        q1 - 3 * (q3 - q1) AS lower_bound,
        q3 + 3 * (q3 - q1) AS upper_bound
    FROM quartiles
)
SELECT
    'Sales outlier flag correctness' AS check_name,
    COUNT(*) AS violations
FROM fact_sales s
CROSS JOIN fence f
WHERE
    s.sales_outlier_flag <>
    (
        s.sales_value < f.lower_bound
        OR s.sales_value > f.upper_bound
    );


-- ============================================================
-- 10. CUSTOMER DATE VALIDATION
-- ============================================================

SELECT
    'Customer since before earliest order' AS check_name,
    COUNT(*) AS violations
FROM dim_customer c
JOIN (
    SELECT
        customer_id,
        MIN(order_date) AS earliest_order_date
    FROM fact_sales
    GROUP BY customer_id
) s
    ON c.customer_id = s.customer_id
WHERE c.customer_since > s.earliest_order_date;


-- ============================================================
-- 11. RETURN VALIDATION
-- ============================================================

SELECT
    'Returns without matching sales order' AS check_name,
    COUNT(*) AS orphan_rows
FROM fact_returns r
LEFT JOIN fact_sales s
    ON r.order_id = s.order_id
WHERE s.order_id IS NULL;


-- ============================================================
-- 12. SHIPMENT VALIDATION
-- ============================================================

SELECT
    'Shipments without matching sales order' AS check_name,
    COUNT(*) AS orphan_rows
FROM fact_shipments sh
LEFT JOIN fact_sales s
    ON sh.order_id = s.order_id
WHERE s.order_id IS NULL;


-- ============================================================
-- 13. NULL VALIDATION
-- ============================================================

SELECT
    'fact_sales NULL order_id' AS check_name,
    COUNT(*) AS violations
FROM fact_sales
WHERE order_id IS NULL;


SELECT
    'fact_inventory NULL product_id' AS check_name,
    COUNT(*) AS violations
FROM fact_inventory
WHERE product_id IS NULL;


-- ============================================================
-- END OF VALIDATION
-- ============================================================