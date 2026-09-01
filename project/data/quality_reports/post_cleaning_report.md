# Post-Cleaning Data Quality Report

Generated: 2026-08-31 16:29:50 UTC
Source: `..\data\cleaned` (data/cleaned/)

Standard audit re-run on the cleaned tables, plus targeted checks on the newly derived columns and confirmation that source values were not altered.

---

## Standard Audit (re-run on cleaned data)


# Data Quality Report

**3 findings** across 3 tables/relationships.

| Severity | Check | Table | Affected | % | Description |
|---|---|---|---|---|---|
| high | Inventory conservation violated | fact_inventory | 11216/146200 | 7.67% | Closing_Stock != Opening_Stock + Received_Qty - Sold_Qty - Damaged_Qty. In every affected row the formula goes negative and Closing_Stock is floored at 0 — i.e. Sold_Qty exceeds what was actually available (oversell/stockout not reconciled). Affects 40 products across 5 warehouses. |
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


---

## Targeted Validation

### Customer_Since correction
- PASS — Customer_Since <= earliest Order_Date for every customer.

### Stockout_Flag / Stockout_Shortfall_Units correctness
- PASS — Stockout_Flag matches recomputed shortfall for every row.
- PASS — Stockout_Shortfall_Units matches recomputed shortfall for every row.

### Sales_Outlier_Flag correctness
- PASS — Sales_Outlier_Flag matches the 3x IQR rule for every row.

### Source values preserved (no silent changes)
- PASS — fact_inventory source columns unchanged (Opening/Received/Sold/Damaged/Closing_Stock).
- PASS — fact_sales.Sales_Value unchanged.
- PASS — dim_product.Product_Status unchanged.
- PASS — dim_customer.Customer_Since_Original exactly preserves the pre-correction value.

---

## Interpretation Note

The standard audit above will still report `fact_inventory` conservation "violations" and `fact_sales` statistical outliers. These are **expected** — per the approved plan, both conditions were preserved as-is and surfaced via `Stockout_Flag`/`Stockout_Shortfall_Units` and `Sales_Outlier_Flag` rather than corrected. The counts in the standard audit section should match the flag counts in the Targeted Validation section above; any mismatch would indicate a pipeline bug.