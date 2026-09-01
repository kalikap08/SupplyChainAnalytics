# Pre-Cleaning Data Quality Report

Generated: 2026-08-31 16:29:47 UTC
Source: `..\data\raw` (data/raw/, untouched copy of source CSVs)

This is the baseline audit the cleaning plan was built from — regenerated here from data/raw/ so it always reflects exactly what the pipeline consumed.

---

# Data Quality Report

**4 findings** across 4 tables/relationships.

| Severity | Check | Table | Affected | % | Description |
|---|---|---|---|---|---|
| high | Inventory conservation violated | fact_inventory | 11216/146200 | 7.67% | Closing_Stock != Opening_Stock + Received_Qty - Sold_Qty - Damaged_Qty. In every affected row the formula goes negative and Closing_Stock is floored at 0 — i.e. Sold_Qty exceeds what was actually available (oversell/stockout not reconciled). Affects 40 products across 5 warehouses. |
| high | Impossible date order | fact_sales x dim_customer | 5519/143495 | 3.85% | Order_Date is earlier than the customer's Customer_Since date — i.e. the customer placed an order before they existed as a customer on record. |
| low | Constant / zero-variance column | dim_product | 40/40 | 100.00% | dim_product.Product_Status only ever takes the value 'Active' — provides no analytical signal (e.g. no discontinued/inactive products to model attrition). |
| low | Statistical outlier (IQR) | fact_sales | 1078/143495 | 0.75% | fact_sales.Sales_Value: 1078 values fall outside [-54130.81, 84926.64] (3.0x IQR fence). Flagged for review, not necessarily wrong. |

---

## [HIGH] Inventory conservation violated — fact_inventory

Closing_Stock != Opening_Stock + Received_Qty - Sold_Qty - Damaged_Qty. In every affected row the formula goes negative and Closing_Stock is floored at 0 — i.e. Sold_Qty exceeds what was actually available (oversell/stockout not reconciled). Affects 40 products across 5 warehouses.

Affected: 11216 / 146200 rows (7.67%)

Sample rows:

|   Date_ID | Product_ID   | Warehouse_ID   |   Opening_Stock |   Received_Qty |   Sold_Qty |   Damaged_Qty |   Closing_Stock |   Implied_Shortfall_Units |
|----------:|:-------------|:---------------|----------------:|---------------:|-----------:|--------------:|----------------:|--------------------------:|
|  20240111 | P0022        | WH05           |               3 |              0 |          4 |             0 |               0 |                         1 |
|  20240111 | P0031        | WH05           |               3 |              0 |          4 |             0 |               0 |                         1 |
|  20240112 | P0013        | WH02           |               2 |              0 |          6 |             0 |               0 |                         4 |
|  20240112 | P0015        | WH02           |               5 |              0 |          9 |             0 |               0 |                         4 |
|  20240112 | P0017        | WH03           |              14 |              0 |         23 |             0 |               0 |                         9 |
|  20240112 | P0018        | WH03           |               1 |              0 |          6 |             0 |               0 |                         5 |
|  20240112 | P0022        | WH05           |               0 |              0 |          5 |             0 |               0 |                         5 |
|  20240112 | P0031        | WH05           |               0 |              0 |          7 |             0 |               0 |                         7 |
|  20240112 | P0037        | WH01           |               2 |              0 |          9 |             0 |               0 |                         7 |
|  20240112 | P0037        | WH02           |               6 |              0 |          9 |             0 |               0 |                         3 |

## [HIGH] Impossible date order — fact_sales x dim_customer

Order_Date is earlier than the customer's Customer_Since date — i.e. the customer placed an order before they existed as a customer on record.

Affected: 5519 / 143495 rows (3.85%)

Sample rows:

| Order_ID    | Customer_ID   | Order_Date          | Customer_Since      |
|:------------|:--------------|:--------------------|:--------------------|
| ORD00000001 | C00099        | 2024-01-01 00:00:00 | 2024-03-16 00:00:00 |
| ORD00000007 | C00129        | 2024-01-01 00:00:00 | 2024-01-15 00:00:00 |
| ORD00000017 | C00354        | 2024-01-01 00:00:00 | 2024-06-14 00:00:00 |
| ORD00000022 | C00612        | 2024-01-01 00:00:00 | 2024-07-03 00:00:00 |
| ORD00000024 | C00249        | 2024-01-01 00:00:00 | 2024-04-14 00:00:00 |
| ORD00000031 | C00274        | 2024-01-01 00:00:00 | 2024-01-09 00:00:00 |
| ORD00000039 | C00539        | 2024-01-01 00:00:00 | 2024-08-03 00:00:00 |
| ORD00000048 | C00234        | 2024-01-01 00:00:00 | 2024-11-17 00:00:00 |
| ORD00000067 | C00511        | 2024-01-01 00:00:00 | 2024-08-21 00:00:00 |
| ORD00000071 | C00196        | 2024-01-01 00:00:00 | 2024-06-05 00:00:00 |

## [LOW] Constant / zero-variance column — dim_product

dim_product.Product_Status only ever takes the value 'Active' — provides no analytical signal (e.g. no discontinued/inactive products to model attrition).

Affected: 40 / 40 rows (100.00%)

## [LOW] Statistical outlier (IQR) — fact_sales

fact_sales.Sales_Value: 1078 values fall outside [-54130.81, 84926.64] (3.0x IQR fence). Flagged for review, not necessarily wrong.

Affected: 1078 / 143495 rows (0.75%)

Sample rows:

|   Sales_Value |
|--------------:|
|        181077 |
|        181077 |
|        167612 |
|        166637 |
|        158791 |
|        153219 |
|        148622 |
|        148576 |
|        148576 |
|        148576 |
