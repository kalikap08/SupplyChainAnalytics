# Cleaning Log

Generated: 2026-08-31 16:29:49 UTC

Every transformation applied by `src/data_cleaning.py`, in table order. Tables not listed as transformed were copied unchanged.


| Table | Column(s) | Rows Affected | Reason |
|---|---|---|---|
| fact_inventory | Stockout_Flag, Stockout_Shortfall_Units (new) | 11216/146200 | Preserve the original stockout/oversell business condition while making it explicitly queryable, instead of silently leaving it embedded in a Closing_Stock value that has been floored at 0. |
| dim_customer | Customer_Since (corrected), Customer_Since_Original (new), Customer_Since_Corrected_Flag (new) | 165/1000 | Customer_Since postdating a customer's first order is a temporal impossibility introduced by the synthetic data generator, not a real business condition. Corrected at the dimension level; no sales rows were touched or deleted. |
| fact_sales | Sales_Outlier_Flag (new) | 1078/143495 | Sales_Value reconciles exactly to Quantity * Unit_Price * (1 - Discount_Rate) for every row, so these are treated as legitimate but unusual transactions, flagged for optional analytical exclusion rather than corrected or removed. |
| dim_product | Product_Status | 0/40 | Classified LOW-PRIORITY / INFORMATIONAL in the approved plan. |
| dim_date | (all) | 0/731 | No data-quality issue identified for this table; no transformation required. |
| dim_product | (all) | 0/40 | No data-quality issue identified for this table; no transformation required. |
| dim_supplier | (all) | 0/12 | No data-quality issue identified for this table; no transformation required. |
| dim_warehouse | (all) | 0/5 | No data-quality issue identified for this table; no transformation required. |
| dim_location | (all) | 0/6 | No data-quality issue identified for this table; no transformation required. |
| dim_carrier | (all) | 0/6 | No data-quality issue identified for this table; no transformation required. |
| fact_purchase_orders | (all) | 0/8292 | No data-quality issue identified for this table; no transformation required. |
| fact_shipments | (all) | 0/143495 | No data-quality issue identified for this table; no transformation required. |
| fact_returns | (all) | 0/7192 | No data-quality issue identified for this table; no transformation required. |

---

## fact_inventory — Stockout_Flag, Stockout_Shortfall_Units (new)

**Transformation rule:** Shortfall = Opening_Stock + Received_Qty - Sold_Qty - Damaged_Qty; Stockout_Flag = Shortfall < 0; Stockout_Shortfall_Units = abs(Shortfall) if Shortfall < 0 else 0. Opening_Stock, Received_Qty, Sold_Qty, Damaged_Qty, Closing_Stock unchanged.

**Rows affected:** 11216 / 146200

**Reason:** Preserve the original stockout/oversell business condition while making it explicitly queryable, instead of silently leaving it embedded in a Closing_Stock value that has been floored at 0.

**Before/after summary:** Stockout_Flag True: 11216 rows (7.67%). Total shortfall units: 103354. Source inventory columns: 0 values changed (verified below).

## dim_customer — Customer_Since (corrected), Customer_Since_Original (new), Customer_Since_Corrected_Flag (new)

**Transformation rule:** For each Customer_ID, Earliest_Order_Date = MIN(fact_sales.Order_Date). Customer_Since_Original = pre-correction value (always populated). If Customer_Since > Earliest_Order_Date: Customer_Since := Earliest_Order_Date and Customer_Since_Corrected_Flag = True; otherwise both are left unchanged and the flag is False. fact_sales is read-only in this step.

**Rows affected:** 165 / 1000

**Reason:** Customer_Since postdating a customer's first order is a temporal impossibility introduced by the synthetic data generator, not a real business condition. Corrected at the dimension level; no sales rows were touched or deleted.

**Before/after summary:** Customers corrected: 165 / 1000 (16.50%). Sales rows implicated by those customers: 23756 (16.56% of fact_sales, none modified).

## fact_sales — Sales_Outlier_Flag (new)

**Transformation rule:** Q1/Q3 = 25th/75th percentile of Sales_Value (5465.24/25330.59); IQR = Q3 - Q1 (19865.35); Lower = Q1 - 3*IQR (-54130.81); Upper = Q3 + 3*IQR (84926.64); Sales_Outlier_Flag = Sales_Value outside [Lower, Upper]. Sales_Value itself is unchanged.

**Rows affected:** 1078 / 143495

**Reason:** Sales_Value reconciles exactly to Quantity * Unit_Price * (1 - Discount_Rate) for every row, so these are treated as legitimate but unusual transactions, flagged for optional analytical exclusion rather than corrected or removed.

**Before/after summary:** Sales_Outlier_Flag True: 1078 rows (0.75%). Sales_Value column: 0 values changed (verified below).

## dim_product — Product_Status

**Transformation rule:** None — constant value is informational, not an error; column left exactly as-is.

**Rows affected:** 0 / 40

**Reason:** Classified LOW-PRIORITY / INFORMATIONAL in the approved plan.

**Before/after summary:** No change.

## dim_date — (all)

**Transformation rule:** None — copied unchanged from data/raw/.

**Rows affected:** 0 / 731

**Reason:** No data-quality issue identified for this table; no transformation required.

**Before/after summary:** Byte-identical to source: True.

## dim_product — (all)

**Transformation rule:** None — copied unchanged from data/raw/.

**Rows affected:** 0 / 40

**Reason:** No data-quality issue identified for this table; no transformation required.

**Before/after summary:** Byte-identical to source: True.

## dim_supplier — (all)

**Transformation rule:** None — copied unchanged from data/raw/.

**Rows affected:** 0 / 12

**Reason:** No data-quality issue identified for this table; no transformation required.

**Before/after summary:** Byte-identical to source: True.

## dim_warehouse — (all)

**Transformation rule:** None — copied unchanged from data/raw/.

**Rows affected:** 0 / 5

**Reason:** No data-quality issue identified for this table; no transformation required.

**Before/after summary:** Byte-identical to source: True.

## dim_location — (all)

**Transformation rule:** None — copied unchanged from data/raw/.

**Rows affected:** 0 / 6

**Reason:** No data-quality issue identified for this table; no transformation required.

**Before/after summary:** Byte-identical to source: True.

## dim_carrier — (all)

**Transformation rule:** None — copied unchanged from data/raw/.

**Rows affected:** 0 / 6

**Reason:** No data-quality issue identified for this table; no transformation required.

**Before/after summary:** Byte-identical to source: True.

## fact_purchase_orders — (all)

**Transformation rule:** None — copied unchanged from data/raw/.

**Rows affected:** 0 / 8292

**Reason:** No data-quality issue identified for this table; no transformation required.

**Before/after summary:** Byte-identical to source: True.

## fact_shipments — (all)

**Transformation rule:** None — copied unchanged from data/raw/.

**Rows affected:** 0 / 143495

**Reason:** No data-quality issue identified for this table; no transformation required.

**Before/after summary:** Byte-identical to source: True.

## fact_returns — (all)

**Transformation rule:** None — copied unchanged from data/raw/.

**Rows affected:** 0 / 7192

**Reason:** No data-quality issue identified for this table; no transformation required.

**Before/after summary:** Byte-identical to source: True.
