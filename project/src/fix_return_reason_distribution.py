"""
Fix synthetic Return_Reason distribution — fact_returns
=========================================================

The source generator assigned Return_Reason as an unweighted uniform draw
over 5 categories: every reason lands within a few rows of exactly 20% of
the ~7,200 returns (1419-1462 rows each — see data/raw/fact_returns.csv).
Real return reasons are never that even; one or two causes (quality/damage)
normally dominate.

This is NOT the same situation as fact_shipments.Delivery_Status, which
looked suspicious for the same reason (a narrow 90-96% on-time band across
carriers) but turned out to be correctly derived from
dim_carrier.Late_Delivery_Probability (verified: recomputing Delivery_Status
from Dispatch_Date/Expected_Delivery_Date/Actual_Delivery_Date produces zero
mismatches against the stored column, and per-carrier on-time rates match
each carrier's designed late-delivery probability almost exactly). That
column is left alone.

Return_Reason has no equivalent dimension table driving it — it is a leaf
attribute with no other column or table depending on its value (confirmed:
Warehouse_ID on returns already comes from a real join to the originating
sales order, not independent randomness, and refund/return-qty patterns
don't vary meaningfully by reason). So re-drawing it in isolation is safe
and doesn't disturb any other relationship in the dataset.

This script re-draws Return_Reason for every row in fact_returns.csv using a
fixed weighted distribution and a fixed random seed — rerunning it produces
byte-identical output. Every other column (Order_ID, Product_ID,
Customer_ID, Warehouse_ID, Return_Date, Returned_Qty, Refund_Value) is left
untouched.

The original file is preserved once, before the first overwrite, as
fact_returns.csv.pre_skew_fix.bak in the same directory.

Usage:
    python fix_return_reason_distribution.py [--data-dir data/raw]
"""

import argparse
import os
import shutil

import numpy as np
import pandas as pd

SEED = 42

RETURN_REASON_WEIGHTS = {
    "Quality Issue": 0.34,
    "Damaged": 0.26,
    "Customer Changed Mind": 0.20,
    "Wrong Product": 0.12,
    "Late Delivery": 0.08,
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--data-dir",
        default="data/raw",
        help="Directory containing fact_returns.csv (default: data/raw).",
    )
    args = parser.parse_args()

    path = os.path.join(args.data_dir, "fact_returns.csv")
    backup_path = path + ".pre_skew_fix.bak"

    if not os.path.exists(path):
        raise SystemExit(f"ERROR: {path} not found.")

    if not os.path.exists(backup_path):
        shutil.copy2(path, backup_path)
        print(f"[backup] Original saved to {backup_path}")
    else:
        print(f"[backup] {backup_path} already exists — leaving it as the pre-fix original.")

    df = pd.read_csv(path, dtype=str)

    reasons = list(RETURN_REASON_WEIGHTS.keys())
    weights = list(RETURN_REASON_WEIGHTS.values())
    assert abs(sum(weights) - 1.0) < 1e-9, "weights must sum to 1.0"

    before = df["Return_Reason"].value_counts()

    rng = np.random.default_rng(SEED)
    df["Return_Reason"] = rng.choice(reasons, size=len(df), p=weights)

    after = df["Return_Reason"].value_counts()

    df.to_csv(path, index=False)

    print("\nBefore (row counts):")
    print(before.to_string())
    print("\nAfter (row counts):")
    print(after.to_string())
    print(f"\nWrote {len(df)} rows to {path}")

    print(
        "\nNext steps to propagate into the dashboard:\n"
        "  1. python data_cleaning.py --source-dir <any-existing-path> --project-dir <project root>\n"
        "     (fact_returns is copied through unchanged, so this just carries the new\n"
        "     distribution into data/cleaned/ and regenerates the quality reports;\n"
        "     --source-dir is required by the script but unused since data/raw/ already exists)\n"
        "  2. python load_to_postgres.py --data-dir data/cleaned --truncate\n"
        "     (reloads every table fresh — this is the destructive/explicit reload path)"
    )


if __name__ == "__main__":
    main()
