"""
Data Quality Checks — Supply Chain Analytics Dataset
=====================================================

READ-ONLY AUDIT SCRIPT. This script only reads the source CSVs and reports
findings. It never writes to, overwrites, or "cleans" the source data — that
is a deliberate choice so the issues below can be reviewed by a human before
any correction/imputation strategy is chosen.

Usage:
    python data_quality_checks.py --data-dir /path/to/supply_chain_dataset --out report.md

Output:
    - A console summary
    - A Markdown report with one section per check, including the actual
      offending rows (sampled) so they can be inspected
"""

import argparse
import os
import sys
from dataclasses import dataclass, field

import numpy as np
import pandas as pd


# --------------------------------------------------------------------------- #
# Utilities
# --------------------------------------------------------------------------- #

@dataclass
class Finding:
    check: str
    table: str
    severity: str          # "high" | "medium" | "low"
    n_affected: int
    n_total: int
    description: str
    sample: pd.DataFrame = field(default_factory=pd.DataFrame)

    @property
    def pct(self) -> float:
        return 100 * self.n_affected / self.n_total if self.n_total else 0.0


class DataQualityAuditor:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.findings: list[Finding] = []
        self.tables: dict[str, pd.DataFrame] = {}

    # -- loading ------------------------------------------------------------ #
    def load(self):
        names = [
            "dim_date", "dim_product", "dim_customer", "dim_supplier",
            "dim_warehouse", "dim_location", "dim_carrier",
            "fact_sales", "fact_inventory", "fact_purchase_orders",
            "fact_shipments", "fact_returns",
        ]
        for name in names:
            path = os.path.join(self.data_dir, f"{name}.csv")
            self.tables[name] = pd.read_csv(path)
        return self

    def add(self, finding: Finding):
        self.findings.append(finding)

    # -- generic structural checks ------------------------------------------ #
    def check_nulls(self):
        for name, df in self.tables.items():
            null_counts = df.isnull().sum()
            null_cols = null_counts[null_counts > 0]
            if len(null_cols):
                self.add(Finding(
                    check="Missing values",
                    table=name,
                    severity="high",
                    n_affected=int(null_cols.sum()),
                    n_total=df.size,
                    description=f"Null values found in columns: {dict(null_cols)}",
                ))

    def check_duplicate_rows(self):
        for name, df in self.tables.items():
            n_dup = df.duplicated().sum()
            if n_dup:
                self.add(Finding(
                    check="Exact duplicate rows",
                    table=name,
                    severity="medium",
                    n_affected=int(n_dup),
                    n_total=len(df),
                    description="Fully duplicated rows (every column identical).",
                    sample=df[df.duplicated(keep=False)].head(10),
                ))

    def check_key_uniqueness(self, table: str, key_cols: list[str]):
        df = self.tables[table]
        n_dup = df.duplicated(subset=key_cols).sum()
        if n_dup:
            self.add(Finding(
                check="Primary/composite key not unique",
                table=table,
                severity="high",
                n_affected=int(n_dup),
                n_total=len(df),
                description=f"Key {key_cols} is expected to be unique but has {n_dup} duplicate combinations.",
                sample=df[df.duplicated(subset=key_cols, keep=False)]
                        .sort_values(key_cols).head(10),
            ))

    def check_referential_integrity(self, child_table: str, fk: str,
                                     parent_table: str, pk: str):
        child, parent = self.tables[child_table], self.tables[parent_table]
        missing_mask = ~child[fk].isin(parent[pk])
        n_missing = missing_mask.sum()
        if n_missing:
            self.add(Finding(
                check="Referential integrity",
                table=child_table,
                severity="high",
                n_affected=int(n_missing),
                n_total=len(child),
                description=f"{child_table}.{fk} has values not present in {parent_table}.{pk} "
                             f"(orphaned foreign keys).",
                sample=child[missing_mask].head(10),
            ))

    def check_range(self, table: str, col: str, min_val=None, max_val=None,
                     allow_equal=True, severity="high"):
        df = self.tables[table]
        mask = pd.Series(False, index=df.index)
        if min_val is not None:
            mask |= (df[col] < min_val) if allow_equal else (df[col] <= min_val)
        if max_val is not None:
            mask |= (df[col] > max_val) if allow_equal else (df[col] >= max_val)
        n_bad = mask.sum()
        if n_bad:
            self.add(Finding(
                check="Out-of-range value",
                table=table,
                severity=severity,
                n_affected=int(n_bad),
                n_total=len(df),
                description=f"{table}.{col} has {n_bad} values outside expected range "
                             f"[{min_val}, {max_val}].",
                sample=df[mask].head(10),
            ))

    def check_categorical_values(self, table: str, col: str, allowed: set,
                                  severity="medium"):
        df = self.tables[table]
        mask = ~df[col].isin(allowed)
        n_bad = mask.sum()
        if n_bad:
            self.add(Finding(
                check="Unexpected categorical value",
                table=table,
                severity=severity,
                n_affected=int(n_bad),
                n_total=len(df),
                description=f"{table}.{col} contains values outside the allowed set {allowed}: "
                             f"{sorted(df.loc[mask, col].unique())}",
                sample=df[mask].head(10),
            ))

    def check_outliers_iqr(self, table: str, col: str, k: float = 3.0,
                            severity="low"):
        df = self.tables[table]
        q1, q3 = df[col].quantile([0.25, 0.75])
        iqr = q3 - q1
        lo, hi = q1 - k * iqr, q3 + k * iqr
        mask = (df[col] < lo) | (df[col] > hi)
        n_bad = mask.sum()
        if n_bad:
            self.add(Finding(
                check="Statistical outlier (IQR)",
                table=table,
                severity=severity,
                n_affected=int(n_bad),
                n_total=len(df),
                description=f"{table}.{col}: {n_bad} values fall outside "
                             f"[{lo:.2f}, {hi:.2f}] ({k}x IQR fence). Flagged for review, "
                             f"not necessarily wrong.",
                sample=df.loc[mask, [col]].sort_values(col, ascending=False).head(10),
            ))

    # -- dataset-specific business-logic checks ------------------------------ #
    def check_sales_value_formula(self):
        fs = self.tables["fact_sales"]
        calc = fs["Quantity"] * fs["Unit_Price"] * (1 - fs["Discount_Rate"])
        mismatch = (calc - fs["Sales_Value"]).abs() > 0.01
        n_bad = mismatch.sum()
        if n_bad:
            self.add(Finding(
                check="Formula reconciliation",
                table="fact_sales",
                severity="high",
                n_affected=int(n_bad),
                n_total=len(fs),
                description="Sales_Value != Quantity * Unit_Price * (1 - Discount_Rate).",
                sample=fs[mismatch].head(10),
            ))

    def check_inventory_conservation(self):
        """
        Closing_Stock should equal Opening_Stock + Received_Qty - Sold_Qty - Damaged_Qty.
        In this dataset Closing_Stock is floored at 0 whenever that formula would go
        negative, which silently breaks unit conservation (i.e. it looks like stock
        was 'sold' that never existed / was never in the warehouse).
        """
        fi = self.tables["fact_inventory"]
        calc_close = fi["Opening_Stock"] + fi["Received_Qty"] - fi["Sold_Qty"] - fi["Damaged_Qty"]
        mismatch = calc_close != fi["Closing_Stock"]
        n_bad = mismatch.sum()
        if n_bad:
            bad = fi[mismatch].copy()
            bad["Implied_Shortfall_Units"] = fi.loc[mismatch, "Closing_Stock"] - calc_close[mismatch]
            self.add(Finding(
                check="Inventory conservation violated",
                table="fact_inventory",
                severity="high",
                n_affected=int(n_bad),
                n_total=len(fi),
                description=(
                    "Closing_Stock != Opening_Stock + Received_Qty - Sold_Qty - Damaged_Qty. "
                    "In every affected row the formula goes negative and Closing_Stock is "
                    "floored at 0 — i.e. Sold_Qty exceeds what was actually available "
                    "(oversell/stockout not reconciled). "
                    f"Affects {bad['Product_ID'].nunique()} products across "
                    f"{bad['Warehouse_ID'].nunique()} warehouses."
                ),
                sample=bad[["Date_ID", "Product_ID", "Warehouse_ID", "Opening_Stock",
                            "Received_Qty", "Sold_Qty", "Damaged_Qty", "Closing_Stock",
                            "Implied_Shortfall_Units"]].head(10),
            ))

    def check_po_value_formula(self):
        fpo = self.tables["fact_purchase_orders"]
        calc = fpo["Ordered_Qty"] * fpo["Unit_Cost"]
        # Unit_Cost is stored rounded to 2dp, so absolute rounding error grows with
        # order size — use a relative tolerance (not a flat $ threshold) so we don't
        # flag harmless rounding noise as a "mismatch".
        mismatch = ~np.isclose(calc, fpo["PO_Value"], rtol=1e-4, atol=0.01)
        n_bad = mismatch.sum()
        if n_bad:
            self.add(Finding(
                check="Formula reconciliation",
                table="fact_purchase_orders",
                severity="medium",
                n_affected=int(n_bad),
                n_total=len(fpo),
                description="PO_Value != Ordered_Qty * Unit_Cost (note: PO_Value is priced "
                             "on the quantity ordered, not the quantity actually received — "
                             "confirm this is the intended business rule before using PO_Value "
                             "as a 'cost of goods received' figure).",
                sample=fpo[mismatch].head(10),
            ))

    def check_date_order(self, table: str, earlier: str, later: str, severity="high"):
        df = self.tables[table]
        d1 = pd.to_datetime(df[earlier])
        d2 = pd.to_datetime(df[later])
        mask = d2 < d1
        n_bad = mask.sum()
        if n_bad:
            self.add(Finding(
                check="Impossible date order",
                table=table,
                severity=severity,
                n_affected=int(n_bad),
                n_total=len(df),
                description=f"{table}.{later} occurs before {table}.{earlier}.",
                sample=df[mask].head(10),
            ))

    def check_customer_since_vs_order(self):
        fs = self.tables["fact_sales"]
        dc = self.tables["dim_customer"]
        merged = fs.merge(dc[["Customer_ID", "Customer_Since"]], on="Customer_ID", how="left")
        merged["Order_Date"] = pd.to_datetime(merged["Order_Date"])
        merged["Customer_Since"] = pd.to_datetime(merged["Customer_Since"])
        mask = merged["Order_Date"] < merged["Customer_Since"]
        n_bad = mask.sum()
        if n_bad:
            self.add(Finding(
                check="Impossible date order",
                table="fact_sales x dim_customer",
                severity="high",
                n_affected=int(n_bad),
                n_total=len(merged),
                description="Order_Date is earlier than the customer's Customer_Since date — "
                             "i.e. the customer placed an order before they existed as a "
                             "customer on record.",
                sample=merged.loc[mask, ["Order_ID", "Customer_ID", "Order_Date", "Customer_Since"]].head(10),
            ))

    def check_constant_column(self, table: str, col: str):
        df = self.tables[table]
        if df[col].nunique() <= 1:
            self.add(Finding(
                check="Constant / zero-variance column",
                table=table,
                severity="low",
                n_affected=len(df),
                n_total=len(df),
                description=f"{table}.{col} only ever takes the value "
                             f"'{df[col].iloc[0]}' — provides no analytical signal "
                             f"(e.g. no discontinued/inactive products to model attrition).",
            ))

    def check_returns_not_exceeding_sales(self):
        fr = self.tables["fact_returns"]
        fs = self.tables["fact_sales"]
        merged = fr.merge(fs[["Order_ID", "Product_ID", "Quantity"]],
                           on=["Order_ID", "Product_ID"], how="left")
        no_match = merged["Quantity"].isna()
        over = merged["Returned_Qty"] > merged["Quantity"]
        for mask, label in [(no_match, "no matching order/product in fact_sales"),
                             (over, "Returned_Qty exceeds originally sold Quantity")]:
            n_bad = mask.sum()
            if n_bad:
                self.add(Finding(
                    check="Returns exceed sales",
                    table="fact_returns x fact_sales",
                    severity="high",
                    n_affected=int(n_bad),
                    n_total=len(merged),
                    description=f"Return rows where {label}.",
                    sample=merged[mask].head(10),
                ))

    # -- runner --------------------------------------------------------------- #
    def run_all(self):
        self.check_nulls()
        self.check_duplicate_rows()

        # key uniqueness
        self.check_key_uniqueness("dim_product", ["Product_ID"])
        self.check_key_uniqueness("dim_customer", ["Customer_ID"])
        self.check_key_uniqueness("dim_supplier", ["Supplier_ID"])
        self.check_key_uniqueness("dim_warehouse", ["Warehouse_ID"])
        self.check_key_uniqueness("dim_location", ["Location_ID"])
        self.check_key_uniqueness("dim_carrier", ["Carrier_ID"])
        self.check_key_uniqueness("fact_sales", ["Order_ID"])
        self.check_key_uniqueness("fact_inventory", ["Date_ID", "Product_ID", "Warehouse_ID"])
        self.check_key_uniqueness("fact_purchase_orders", ["PO_ID"])
        self.check_key_uniqueness("fact_shipments", ["Shipment_ID"])
        self.check_key_uniqueness("fact_shipments", ["Order_ID"])  # expected 1:1 with sales
        self.check_key_uniqueness("fact_returns", ["Return_ID"])

        # referential integrity
        self.check_referential_integrity("fact_sales", "Product_ID", "dim_product", "Product_ID")
        self.check_referential_integrity("fact_sales", "Customer_ID", "dim_customer", "Customer_ID")
        self.check_referential_integrity("fact_sales", "Warehouse_ID", "dim_warehouse", "Warehouse_ID")
        self.check_referential_integrity("fact_inventory", "Product_ID", "dim_product", "Product_ID")
        self.check_referential_integrity("fact_inventory", "Warehouse_ID", "dim_warehouse", "Warehouse_ID")
        self.check_referential_integrity("fact_purchase_orders", "Supplier_ID", "dim_supplier", "Supplier_ID")
        self.check_referential_integrity("fact_purchase_orders", "Product_ID", "dim_product", "Product_ID")
        self.check_referential_integrity("fact_purchase_orders", "Warehouse_ID", "dim_warehouse", "Warehouse_ID")
        self.check_referential_integrity("fact_shipments", "Order_ID", "fact_sales", "Order_ID")
        self.check_referential_integrity("fact_shipments", "Carrier_ID", "dim_carrier", "Carrier_ID")
        self.check_referential_integrity("fact_returns", "Order_ID", "fact_sales", "Order_ID")
        self.check_referential_integrity("fact_returns", "Product_ID", "dim_product", "Product_ID")
        self.check_referential_integrity("fact_returns", "Customer_ID", "dim_customer", "Customer_ID")
        self.check_referential_integrity("dim_customer", "Location_ID", "dim_location", "Location_ID")
        self.check_referential_integrity("dim_warehouse", "Location_ID", "dim_location", "Location_ID")
        self.check_referential_integrity("dim_product", "Primary_Supplier_ID", "dim_supplier", "Supplier_ID")

        # range / sanity checks
        self.check_range("fact_sales", "Quantity", min_val=1)
        self.check_range("fact_sales", "Unit_Price", min_val=0, allow_equal=False)
        self.check_range("fact_sales", "Discount_Rate", min_val=0, max_val=1)
        self.check_range("fact_inventory", "Opening_Stock", min_val=0)
        self.check_range("fact_inventory", "Closing_Stock", min_val=0)
        self.check_range("fact_purchase_orders", "Received_Qty", min_val=0)
        self.check_range("fact_returns", "Returned_Qty", min_val=1)
        self.check_range("fact_returns", "Refund_Value", min_val=0, allow_equal=False)

        po = self.tables["fact_purchase_orders"]
        over_received = po["Received_Qty"] > po["Ordered_Qty"]
        if over_received.sum():
            self.add(Finding(
                check="Logical inconsistency", table="fact_purchase_orders", severity="high",
                n_affected=int(over_received.sum()), n_total=len(po),
                description="Received_Qty exceeds Ordered_Qty.",
                sample=po[over_received].head(10),
            ))

        # categorical audits
        self.check_categorical_values("dim_customer", "Customer_Type",
                                       {"Consumer", "Enterprise", "Small Business"})
        self.check_categorical_values("dim_customer", "Sales_Channel",
                                       {"Marketplace", "Online", "Retail Store"})
        self.check_categorical_values("fact_shipments", "Delivery_Status", {"On Time", "Late"})
        self.check_categorical_values(
            "fact_returns", "Return_Reason",
            {"Quality Issue", "Wrong Product", "Customer Changed Mind",
             "Late Delivery", "Damaged"})

        # formula reconciliation
        self.check_sales_value_formula()
        self.check_po_value_formula()
        self.check_inventory_conservation()

        # temporal logic
        self.check_date_order("fact_purchase_orders", "Order_Date", "Actual_Delivery_Date")
        self.check_date_order("fact_shipments", "Dispatch_Date", "Actual_Delivery_Date")
        self.check_customer_since_vs_order()

        # cross-fact consistency
        self.check_returns_not_exceeding_sales()

        # low-signal columns worth flagging
        self.check_constant_column("dim_product", "Product_Status")

        # outliers — informational only, not treated as "errors"
        self.check_outliers_iqr("fact_sales", "Sales_Value")
        self.check_outliers_iqr("fact_returns", "Refund_Value")

        return self.findings

    # -- reporting ------------------------------------------------------------ #
    def to_markdown(self) -> str:
        lines = ["# Data Quality Report\n"]
        if not self.findings:
            lines.append("No issues detected.\n")
            return "\n".join(lines)

        order = {"high": 0, "medium": 1, "low": 2}
        findings_sorted = sorted(self.findings, key=lambda f: (order[f.severity], -f.pct))

        lines.append(f"**{len(findings_sorted)} findings** across "
                      f"{len({f.table for f in findings_sorted})} tables/relationships.\n")
        lines.append("| Severity | Check | Table | Affected | % | Description |")
        lines.append("|---|---|---|---|---|---|")
        for f in findings_sorted:
            lines.append(f"| {f.severity} | {f.check} | {f.table} | {f.n_affected}/{f.n_total} "
                          f"| {f.pct:.2f}% | {f.description} |")

        lines.append("\n---\n")
        for f in findings_sorted:
            lines.append(f"## [{f.severity.upper()}] {f.check} — {f.table}\n")
            lines.append(f"{f.description}\n")
            lines.append(f"Affected: {f.n_affected} / {f.n_total} rows ({f.pct:.2f}%)\n")
            if not f.sample.empty:
                lines.append("Sample rows:\n")
                lines.append(f.sample.to_markdown(index=False))
                lines.append("")
        return "\n".join(lines)


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #

def main():
    parser = argparse.ArgumentParser(description="Audit supply-chain dataset for data-quality issues.")
    parser.add_argument("--data-dir", required=True, help="Folder containing the CSV files.")
    parser.add_argument("--out", default="data_quality_report.md", help="Path for the Markdown report.")
    args = parser.parse_args()

    auditor = DataQualityAuditor(args.data_dir).load()
    findings = auditor.run_all()

    high = sum(1 for f in findings if f.severity == "high")
    medium = sum(1 for f in findings if f.severity == "medium")
    low = sum(1 for f in findings if f.severity == "low")
    print(f"Found {len(findings)} issues -> high: {high}, medium: {medium}, low: {low}")
    for f in sorted(findings, key=lambda f: f.severity):
        print(f"  [{f.severity}] {f.check} ({f.table}): {f.n_affected}/{f.n_total} rows ({f.pct:.2f}%)")

    with open(args.out, "w") as fh:
        fh.write(auditor.to_markdown())
    print(f"\nFull report written to {args.out}")


if __name__ == "__main__":
    main()
