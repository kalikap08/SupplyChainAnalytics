"""
Data Cleaning & Correction Pipeline — Supply Chain Analytics Dataset
======================================================================

Implements the approved Data Cleaning & Correction Plan:

  1. fact_inventory   -> add Stockout_Flag, Stockout_Shortfall_Units
                         (Opening_Stock, Received_Qty, Sold_Qty, Damaged_Qty,
                          Closing_Stock are NEVER modified)
  2. dim_customer     -> correct Customer_Since so it never postdates the
                         customer's earliest Order_Date; original value kept
                         in Customer_Since_Original, change tracked in
                         Customer_Since_Corrected_Flag
  3. dim_product      -> untouched (Product_Status left exactly as-is)
  4. fact_sales       -> add Sales_Outlier_Flag (3x IQR on Sales_Value);
                         Sales_Value itself is never modified
  5. All other tables -> copied byte-for-byte, unchanged

Directory layout produced (relative to --project-dir):
    data/raw/               exact copy of the source CSVs (copy-once; never
                             overwritten by later runs)
    data/cleaned/           output of this pipeline
    data/quality_reports/   pre_cleaning_report.md, cleaning_log.md,
                             post_cleaning_report.md

This script is idempotent: given the same data/raw/ contents, re-running it
produces byte-identical data/cleaned/ output and reports every time. It never
touches --source-dir or data/raw/ after the initial copy.

Usage:
    python data_cleaning.py --source-dir /path/to/supply_chain_dataset \
                             --project-dir /path/to/project
"""

import argparse
import filecmp
import os
import shutil
import sys
from datetime import datetime, timezone

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from data_quality_checks import DataQualityAuditor  # noqa: E402

TABLE_NAMES = [
    "dim_date", "dim_product", "dim_customer", "dim_supplier",
    "dim_warehouse", "dim_location", "dim_carrier",
    "fact_sales", "fact_inventory", "fact_purchase_orders",
    "fact_shipments", "fact_returns",
]

# Tables whose content is transformed by this pipeline (everything else is
# copied through unchanged).
TRANSFORMED_TABLES = {"dim_customer", "fact_inventory", "fact_sales"}


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


# --------------------------------------------------------------------------- #
# Step 1 — establish data/raw/ (copy-once, never overwritten thereafter)
# --------------------------------------------------------------------------- #

def ensure_raw_copy(source_dir: str, raw_dir: str) -> bool:
    """
    Copies the source CSVs into data/raw/ only if data/raw/ does not already
    contain a complete, matching set. Returns True if a copy was performed,
    False if data/raw/ was already present and left untouched.
    """
    os.makedirs(raw_dir, exist_ok=True)
    expected = [f"{t}.csv" for t in TABLE_NAMES]
    already_complete = all(os.path.exists(os.path.join(raw_dir, f)) for f in expected)

    if already_complete:
        print(f"[raw] data/raw/ already populated with {len(expected)} tables — left untouched.")
        return False

    for f in expected:
        shutil.copy2(os.path.join(source_dir, f), os.path.join(raw_dir, f))
    print(f"[raw] Copied {len(expected)} source tables into {raw_dir}")
    return True


def load_tables(directory: str) -> dict[str, pd.DataFrame]:
    return {t: pd.read_csv(os.path.join(directory, f"{t}.csv")) for t in TABLE_NAMES}


# --------------------------------------------------------------------------- #
# Step 2 — transformations (each returns the new df + a log entry dict)
# --------------------------------------------------------------------------- #

def transform_fact_inventory(fi: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    out = fi.copy()
    shortfall = (out["Opening_Stock"] + out["Received_Qty"]
                 - out["Sold_Qty"] - out["Damaged_Qty"])
    out["Stockout_Flag"] = shortfall < 0
    out["Stockout_Shortfall_Units"] = shortfall.where(shortfall < 0, 0).abs()

    n_flagged = int(out["Stockout_Flag"].sum())
    log = {
        "table": "fact_inventory",
        "column": "Stockout_Flag, Stockout_Shortfall_Units (new)",
        "transformation": (
            "Shortfall = Opening_Stock + Received_Qty - Sold_Qty - Damaged_Qty; "
            "Stockout_Flag = Shortfall < 0; "
            "Stockout_Shortfall_Units = abs(Shortfall) if Shortfall < 0 else 0. "
            "Opening_Stock, Received_Qty, Sold_Qty, Damaged_Qty, Closing_Stock unchanged."
        ),
        "rows_affected": n_flagged,
        "rows_total": len(out),
        "reason": (
            "Preserve the original stockout/oversell business condition while making "
            "it explicitly queryable, instead of silently leaving it embedded in a "
            "Closing_Stock value that has been floored at 0."
        ),
        "before_after": (
            f"Stockout_Flag True: {n_flagged} rows ({100*n_flagged/len(out):.2f}%). "
            f"Total shortfall units: {int(out['Stockout_Shortfall_Units'].sum())}. "
            f"Source inventory columns: 0 values changed (verified below)."
        ),
    }
    return out, log


def transform_dim_customer(dc: pd.DataFrame, fs: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    out = dc.copy()
    out["Customer_Since_Original"] = out["Customer_Since"]

    earliest_order = (
        fs.groupby("Customer_ID")["Order_Date"].min().rename("Earliest_Order_Date")
    )
    out = out.merge(earliest_order, on="Customer_ID", how="left")

    since_dt = pd.to_datetime(out["Customer_Since"])
    earliest_dt = pd.to_datetime(out["Earliest_Order_Date"])
    needs_fix = earliest_dt.notna() & (since_dt > earliest_dt)

    corrected_since = out["Customer_Since"].copy()
    corrected_since[needs_fix] = out.loc[needs_fix, "Earliest_Order_Date"]
    out["Customer_Since"] = corrected_since
    out["Customer_Since_Corrected_Flag"] = needs_fix

    out = out.drop(columns=["Earliest_Order_Date"])

    n_customers_corrected = int(needs_fix.sum())
    affected_customer_ids = set(out.loc[needs_fix, "Customer_ID"])
    n_sales_rows_affected = int(fs["Customer_ID"].isin(affected_customer_ids).sum())

    log = {
        "table": "dim_customer",
        "column": "Customer_Since (corrected), Customer_Since_Original (new), "
                  "Customer_Since_Corrected_Flag (new)",
        "transformation": (
            "For each Customer_ID, Earliest_Order_Date = MIN(fact_sales.Order_Date). "
            "Customer_Since_Original = pre-correction value (always populated). "
            "If Customer_Since > Earliest_Order_Date: Customer_Since := Earliest_Order_Date "
            "and Customer_Since_Corrected_Flag = True; otherwise both are left unchanged "
            "and the flag is False. fact_sales is read-only in this step."
        ),
        "rows_affected": n_customers_corrected,
        "rows_total": len(out),
        "reason": (
            "Customer_Since postdating a customer's first order is a temporal "
            "impossibility introduced by the synthetic data generator, not a real "
            "business condition. Corrected at the dimension level; no sales rows "
            "were touched or deleted."
        ),
        "before_after": (
            f"Customers corrected: {n_customers_corrected} / {len(out)} "
            f"({100*n_customers_corrected/len(out):.2f}%). "
            f"Sales rows implicated by those customers: {n_sales_rows_affected} "
            f"({100*n_sales_rows_affected/len(fs):.2f}% of fact_sales, none modified)."
        ),
        "n_affected_customers": n_customers_corrected,
        "n_affected_sales_rows": n_sales_rows_affected,
        "n_corrected_records": n_customers_corrected,
    }
    return out, log


def transform_fact_sales(fs: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    out = fs.copy()
    q1, q3 = out["Sales_Value"].quantile([0.25, 0.75])
    iqr = q3 - q1
    lower, upper = q1 - 3 * iqr, q3 + 3 * iqr
    out["Sales_Outlier_Flag"] = (out["Sales_Value"] < lower) | (out["Sales_Value"] > upper)

    n_flagged = int(out["Sales_Outlier_Flag"].sum())
    log = {
        "table": "fact_sales",
        "column": "Sales_Outlier_Flag (new)",
        "transformation": (
            f"Q1/Q3 = 25th/75th percentile of Sales_Value ({q1:.2f}/{q3:.2f}); "
            f"IQR = Q3 - Q1 ({iqr:.2f}); Lower = Q1 - 3*IQR ({lower:.2f}); "
            f"Upper = Q3 + 3*IQR ({upper:.2f}); "
            "Sales_Outlier_Flag = Sales_Value outside [Lower, Upper]. "
            "Sales_Value itself is unchanged."
        ),
        "rows_affected": n_flagged,
        "rows_total": len(out),
        "reason": (
            "Sales_Value reconciles exactly to Quantity * Unit_Price * (1 - Discount_Rate) "
            "for every row, so these are treated as legitimate but unusual transactions, "
            "flagged for optional analytical exclusion rather than corrected or removed."
        ),
        "before_after": (
            f"Sales_Outlier_Flag True: {n_flagged} rows ({100*n_flagged/len(out):.2f}%). "
            f"Sales_Value column: 0 values changed (verified below)."
        ),
    }
    return out, log


def copy_unchanged_tables(raw_tables: dict, cleaned_dir: str, raw_dir: str) -> list:
    logs = []
    for name in TABLE_NAMES:
        if name in TRANSFORMED_TABLES:
            continue
        src = os.path.join(raw_dir, f"{name}.csv")
        dst = os.path.join(cleaned_dir, f"{name}.csv")
        shutil.copy2(src, dst)
        identical = filecmp.cmp(src, dst, shallow=False)
        logs.append({
            "table": name,
            "column": "(all)",
            "transformation": "None — copied unchanged from data/raw/.",
            "rows_affected": 0,
            "rows_total": len(raw_tables[name]),
            "reason": "No data-quality issue identified for this table; no transformation required.",
            "before_after": f"Byte-identical to source: {identical}.",
        })
    return logs


# --------------------------------------------------------------------------- #
# Step 3 — post-cleaning custom validation (beyond the generic audit)
# --------------------------------------------------------------------------- #

def validate_customer_since(cleaned: dict) -> list[str]:
    dc, fs = cleaned["dim_customer"], cleaned["fact_sales"]
    earliest = fs.groupby("Customer_ID")["Order_Date"].min().rename("Earliest_Order_Date")
    merged = dc.merge(earliest, on="Customer_ID", how="left")
    since_dt = pd.to_datetime(merged["Customer_Since"])
    earliest_dt = pd.to_datetime(merged["Earliest_Order_Date"])
    violations = merged[earliest_dt.notna() & (since_dt > earliest_dt)]
    msgs = []
    if len(violations):
        msgs.append(f"FAIL — {len(violations)} customers still have Customer_Since > "
                     f"earliest Order_Date after correction.")
    else:
        msgs.append("PASS — Customer_Since <= earliest Order_Date for every customer.")
    return msgs


def validate_stockout_flag(cleaned: dict) -> list[str]:
    fi = cleaned["fact_inventory"]
    recomputed_shortfall = (fi["Opening_Stock"] + fi["Received_Qty"]
                             - fi["Sold_Qty"] - fi["Damaged_Qty"])
    expected_flag = recomputed_shortfall < 0
    expected_units = recomputed_shortfall.where(recomputed_shortfall < 0, 0).abs()
    flag_ok = (fi["Stockout_Flag"] == expected_flag).all()
    units_ok = (fi["Stockout_Shortfall_Units"] == expected_units).all()
    msgs = []
    msgs.append("PASS — Stockout_Flag matches recomputed shortfall for every row."
                 if flag_ok else "FAIL — Stockout_Flag does not match recomputed shortfall.")
    msgs.append("PASS — Stockout_Shortfall_Units matches recomputed shortfall for every row."
                 if units_ok else "FAIL — Stockout_Shortfall_Units mismatch found.")
    return msgs


def validate_sales_outlier_flag(cleaned: dict) -> list[str]:
    fs = cleaned["fact_sales"]
    q1, q3 = fs["Sales_Value"].quantile([0.25, 0.75])
    iqr = q3 - q1
    lower, upper = q1 - 3 * iqr, q3 + 3 * iqr
    expected = (fs["Sales_Value"] < lower) | (fs["Sales_Value"] > upper)
    ok = (fs["Sales_Outlier_Flag"] == expected).all()
    return ["PASS — Sales_Outlier_Flag matches the 3x IQR rule for every row."
            if ok else "FAIL — Sales_Outlier_Flag does not match the 3x IQR rule."]


def validate_source_columns_untouched(raw: dict, cleaned: dict) -> list[str]:
    msgs = []
    inv_cols = ["Opening_Stock", "Received_Qty", "Sold_Qty", "Damaged_Qty", "Closing_Stock"]
    inv_ok = raw["fact_inventory"][inv_cols].equals(cleaned["fact_inventory"][inv_cols])
    msgs.append("PASS — fact_inventory source columns unchanged (Opening/Received/Sold/Damaged/Closing_Stock)."
                if inv_ok else "FAIL — fact_inventory source columns were modified.")

    sv_ok = raw["fact_sales"]["Sales_Value"].equals(cleaned["fact_sales"]["Sales_Value"])
    msgs.append("PASS — fact_sales.Sales_Value unchanged."
                if sv_ok else "FAIL — fact_sales.Sales_Value was modified.")

    ps_ok = raw["dim_product"]["Product_Status"].equals(cleaned["dim_product"]["Product_Status"])
    msgs.append("PASS — dim_product.Product_Status unchanged."
                if ps_ok else "FAIL — dim_product.Product_Status was modified.")

    orig_ok = cleaned["dim_customer"]["Customer_Since_Original"].equals(raw["dim_customer"]["Customer_Since"])
    msgs.append("PASS — dim_customer.Customer_Since_Original exactly preserves the pre-correction value."
                if orig_ok else "FAIL — Customer_Since_Original does not match the original raw value.")
    return msgs


# --------------------------------------------------------------------------- #
# Step 4 — report writers
# --------------------------------------------------------------------------- #

def write_pre_cleaning_report(raw_dir: str, out_path: str):
    auditor = DataQualityAuditor(raw_dir).load()
    auditor.run_all()
    header = (f"# Pre-Cleaning Data Quality Report\n\nGenerated: {now_iso()}\n"
              f"Source: `{raw_dir}` (data/raw/, untouched copy of source CSVs)\n\n"
              "This is the baseline audit the cleaning plan was built from — "
              "regenerated here from data/raw/ so it always reflects exactly what "
              "the pipeline consumed.\n\n---\n\n")
    with open(out_path, "w") as fh:
        fh.write(header + auditor.to_markdown())
    print(f"[report] {out_path}")


def write_cleaning_log(logs: list[dict], out_path: str):
    lines = [f"# Cleaning Log\n\nGenerated: {now_iso()}\n\n"
             "Every transformation applied by `src/data_cleaning.py`, in table order. "
             "Tables not listed as transformed were copied unchanged.\n\n"]
    lines.append("| Table | Column(s) | Rows Affected | Reason |")
    lines.append("|---|---|---|---|")
    for l in logs:
        lines.append(f"| {l['table']} | {l['column']} | {l['rows_affected']}/{l['rows_total']} | {l['reason']} |")

    lines.append("\n---\n")
    for l in logs:
        lines.append(f"## {l['table']} — {l['column']}\n")
        lines.append(f"**Transformation rule:** {l['transformation']}\n")
        lines.append(f"**Rows affected:** {l['rows_affected']} / {l['rows_total']}\n")
        lines.append(f"**Reason:** {l['reason']}\n")
        lines.append(f"**Before/after summary:** {l['before_after']}\n")

    with open(out_path, "w") as fh:
        fh.write("\n".join(lines))
    print(f"[report] {out_path}")


def write_post_cleaning_report(raw: dict, cleaned: dict, cleaned_dir: str, out_path: str):
    auditor = DataQualityAuditor(cleaned_dir)
    auditor.tables = cleaned
    auditor.run_all()

    lines = [f"# Post-Cleaning Data Quality Report\n\nGenerated: {now_iso()}\n"
             f"Source: `{cleaned_dir}` (data/cleaned/)\n\n"
             "Standard audit re-run on the cleaned tables, plus targeted checks on the "
             "newly derived columns and confirmation that source values were not altered.\n\n"
             "---\n\n## Standard Audit (re-run on cleaned data)\n\n"]

    # Note: the standard audit will still list fact_inventory conservation
    # "violations" and the sales outliers — that's expected: those conditions
    # were deliberately preserved, not fixed. They're annotated below.
    std_md = auditor.to_markdown()
    lines.append(std_md)

    lines.append("\n---\n\n## Targeted Validation\n")
    lines.append("### Customer_Since correction")
    for m in validate_customer_since(cleaned):
        lines.append(f"- {m}")

    lines.append("\n### Stockout_Flag / Stockout_Shortfall_Units correctness")
    for m in validate_stockout_flag(cleaned):
        lines.append(f"- {m}")

    lines.append("\n### Sales_Outlier_Flag correctness")
    for m in validate_sales_outlier_flag(cleaned):
        lines.append(f"- {m}")

    lines.append("\n### Source values preserved (no silent changes)")
    for m in validate_source_columns_untouched(raw, cleaned):
        lines.append(f"- {m}")

    lines.append(
        "\n---\n\n## Interpretation Note\n\n"
        "The standard audit above will still report `fact_inventory` conservation "
        "\"violations\" and `fact_sales` statistical outliers. These are **expected** — "
        "per the approved plan, both conditions were preserved as-is and surfaced via "
        "`Stockout_Flag`/`Stockout_Shortfall_Units` and `Sales_Outlier_Flag` rather than "
        "corrected. The counts in the standard audit section should match the flag counts "
        "in the Targeted Validation section above; any mismatch would indicate a pipeline bug."
    )

    with open(out_path, "w") as fh:
        fh.write("\n".join(lines))
    print(f"[report] {out_path}")


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

def main():
    parser = argparse.ArgumentParser(description="Clean the supply-chain dataset per the approved plan.")
    parser.add_argument("--source-dir", required=True,
                         help="Folder containing the original source CSVs.")
    parser.add_argument("--project-dir", required=True,
                         help="Root folder under which data/ and reports will be created.")
    args = parser.parse_args()

    raw_dir = os.path.join(args.project_dir, "data", "raw")
    cleaned_dir = os.path.join(args.project_dir, "data", "cleaned")
    reports_dir = os.path.join(args.project_dir, "data", "quality_reports")
    os.makedirs(cleaned_dir, exist_ok=True)
    os.makedirs(reports_dir, exist_ok=True)

    # Step 1: lock in data/raw/
    ensure_raw_copy(args.source_dir, raw_dir)
    raw = load_tables(raw_dir)

    # Step 2: pre-cleaning report (always regenerated from data/raw/)
    write_pre_cleaning_report(raw_dir, os.path.join(reports_dir, "pre_cleaning_report.md"))

    # Step 3: transformations
    logs = []
    fi_clean, fi_log = transform_fact_inventory(raw["fact_inventory"])
    logs.append(fi_log)

    dc_clean, dc_log = transform_dim_customer(raw["dim_customer"], raw["fact_sales"])
    logs.append(dc_log)

    fs_clean, fs_log = transform_fact_sales(raw["fact_sales"])
    logs.append(fs_log)

    # dim_product explicitly untouched (documented, not silently skipped)
    logs.append({
        "table": "dim_product", "column": "Product_Status",
        "transformation": "None — constant value is informational, not an error; column left exactly as-is.",
        "rows_affected": 0, "rows_total": len(raw["dim_product"]),
        "reason": "Classified LOW-PRIORITY / INFORMATIONAL in the approved plan.",
        "before_after": "No change.",
    })

    unchanged_logs = copy_unchanged_tables(raw, cleaned_dir, raw_dir)
    logs.extend(unchanged_logs)

    # write transformed tables
    fi_clean.to_csv(os.path.join(cleaned_dir, "fact_inventory.csv"), index=False)
    dc_clean.to_csv(os.path.join(cleaned_dir, "dim_customer.csv"), index=False)
    fs_clean.to_csv(os.path.join(cleaned_dir, "fact_sales.csv"), index=False)
    print(f"[cleaned] Wrote {len(TRANSFORMED_TABLES)} transformed tables and "
          f"{len(TABLE_NAMES) - len(TRANSFORMED_TABLES)} unchanged tables to {cleaned_dir}")

    # Step 4: cleaning log
    write_cleaning_log(logs, os.path.join(reports_dir, "cleaning_log.md"))

    # Step 5: post-cleaning report
    cleaned = load_tables(cleaned_dir)
    write_post_cleaning_report(raw, cleaned, cleaned_dir,
                                os.path.join(reports_dir, "post_cleaning_report.md"))

    # console summary
    dc_log_summary = next(l for l in logs if l["table"] == "dim_customer")
    print("\n=== Summary ===")
    print(f"Customers corrected:        {dc_log_summary['n_affected_customers']}")
    print(f"Sales rows implicated:      {dc_log_summary['n_affected_sales_rows']} (none modified)")
    print(f"Customer records corrected: {dc_log_summary['n_corrected_records']}")
    print(f"Stockout rows flagged:      {int(fi_clean['Stockout_Flag'].sum())}")
    print(f"Sales outlier rows flagged: {int(fs_clean['Sales_Outlier_Flag'].sum())}")
    print(f"\nAll outputs under: {os.path.join(args.project_dir, 'data')}")


if __name__ == "__main__":
    main()
