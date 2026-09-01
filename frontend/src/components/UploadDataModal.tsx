"use client";

import { useRef, useState } from "react";
import { uploadTableCsv, ApiError, type UploadResult } from "@/lib/api";
import { IconUpload, IconClose, IconCheck, IconAlert } from "@/components/icons";

const TABLE_OPTIONS = {
  "Fact tables": [
    { value: "fact_sales", label: "Sales" },
    { value: "fact_inventory", label: "Inventory" },
    { value: "fact_purchase_orders", label: "Purchase Orders" },
    { value: "fact_shipments", label: "Shipments" },
    { value: "fact_returns", label: "Returns" },
  ],
  "Dimension tables": [
    { value: "dim_product", label: "Products" },
    { value: "dim_customer", label: "Customers" },
    { value: "dim_supplier", label: "Suppliers" },
    { value: "dim_warehouse", label: "Warehouses" },
    { value: "dim_location", label: "Locations" },
    { value: "dim_carrier", label: "Carriers" },
    { value: "dim_date", label: "Dates" },
  ],
} as const;

const DEFAULT_TABLE = TABLE_OPTIONS["Fact tables"][0].value;

type Status = "idle" | "uploading" | "success" | "error";

export default function UploadDataModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [table, setTable] = useState<string>(DEFAULT_TABLE);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetState() {
    setTable(DEFAULT_TABLE);
    setFile(null);
    setStatus("idle");
    setResult(null);
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openModal() {
    resetState();
    setIsOpen(true);
  }

  function closeModal() {
    if (status === "uploading") return;
    setIsOpen(false);
  }

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setErrorMessage("");

    try {
      const uploadResult = await uploadTableCsv(table, file);
      setResult(uploadResult);
      setStatus("success");
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : "Upload failed unexpectedly."
      );
      setStatus("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3.5 py-2 text-[13px] font-medium text-ink-900 shadow-card transition-colors hover:bg-surface"
      >
        <IconUpload width={15} height={15} />
        Upload Data
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-navy-950/60 backdrop-blur-[1px]"
            onClick={closeModal}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-md rounded-xl2 border border-surface-border bg-surface-card p-6 shadow-cardHover">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-ink-900">
                  Upload Data
                </h2>
                <p className="mt-1 text-[12.5px] text-ink-400">
                  Replace a raw table&apos;s data from a CSV file.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                disabled={status === "uploading"}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-surface hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconClose width={16} height={16} />
              </button>
            </div>

            {status === "success" && result ? (
              <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-accent-emerald/20 bg-accent-emerald/10 p-3.5 text-[13px] text-accent-emerald">
                <IconCheck width={16} height={16} className="mt-0.5 shrink-0" />
                <span className="leading-snug">
                  Replaced <strong>{result.table}</strong> with{" "}
                  {result.rows_loaded.toLocaleString()} rows.
                </span>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="upload-table-select"
                    className="block text-[12.5px] font-medium text-ink-600"
                  >
                    Table
                  </label>
                  <select
                    id="upload-table-select"
                    value={table}
                    onChange={(e) => setTable(e.target.value)}
                    disabled={status === "uploading"}
                    className="mt-1.5 w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-[13px] text-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {Object.entries(TABLE_OPTIONS).map(([groupLabel, options]) => (
                      <optgroup key={groupLabel} label={groupLabel}>
                        {options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.value} — {opt.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="upload-file-input"
                    className="block text-[12.5px] font-medium text-ink-600"
                  >
                    CSV File
                  </label>
                  <input
                    id="upload-file-input"
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    disabled={status === "uploading"}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="mt-1.5 block w-full text-[13px] text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium file:text-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                {status === "error" && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-accent-rose/20 bg-accent-rose/10 p-3.5 text-[13px] text-accent-rose">
                    <IconAlert width={16} height={16} className="mt-0.5 shrink-0" />
                    <span className="leading-snug">{errorMessage}</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              {status === "success" ? (
                <>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-surface-border bg-surface-card px-3.5 py-2 text-[13px] font-medium text-ink-900 transition-colors hover:bg-surface"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="rounded-lg bg-accent-blue px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-blue/90"
                  >
                    Refresh dashboard
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={status === "uploading"}
                    className="rounded-lg border border-surface-border bg-surface-card px-3.5 py-2 text-[13px] font-medium text-ink-900 transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!file || status === "uploading"}
                    className="flex items-center gap-2 rounded-lg bg-accent-blue px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {status === "uploading" ? "Uploading…" : "Upload"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
