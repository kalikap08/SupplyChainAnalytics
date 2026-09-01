"use client";

import { useEffect, useState } from "react";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import type { PaginatedResult } from "@/types/analytics";
import { ApiError } from "@/lib/api";
import { IconClose } from "@/components/icons";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 350;

interface DrilldownModalProps<T> {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string;
  fetcher: (params: {
    page: number;
    pageSize: number;
    search: string;
  }) => Promise<PaginatedResult<T>>;
  searchPlaceholder?: string;
}

export default function DrilldownModal<T>({
  open,
  onClose,
  title,
  description,
  columns,
  rowKey,
  fetcher,
  searchPlaceholder = "Search…",
}: DrilldownModalProps<T>) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<PaginatedResult<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fresh state every time the modal opens.
  useEffect(() => {
    if (open) {
      setPage(1);
      setSearchInput("");
      setSearch("");
      setResult(null);
      setError(null);
    }
  }, [open]);

  // Debounce the search box before it drives a fetch.
  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher({ page, pageSize: PAGE_SIZE, search })
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load records.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, page, search]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const total = result?.total ?? 0;
  const rows = result?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(total, page * PAGE_SIZE);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8 sm:items-center">
      <div
        className="fixed inset-0 bg-navy-950/60 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-xl2 border border-surface-border bg-surface-card shadow-cardHover">
        <div className="flex items-start justify-between gap-4 border-b border-surface-border px-6 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink-900">{title}</h2>
            {description && (
              <p className="mt-1 text-[12.5px] text-ink-400">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-surface hover:text-ink-900"
          >
            <IconClose width={16} height={16} />
          </button>
        </div>

        <div className="border-b border-surface-border px-6 py-3">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-[13px] text-ink-900 outline-none focus:border-accent-blue"
          />
        </div>

        <div className="max-h-[55vh] min-h-[240px] overflow-y-auto px-6 py-4">
          {loading && !result && (
            <p className="py-16 text-center text-[13px] text-ink-400">Loading…</p>
          )}
          {error && (
            <p className="py-16 text-center text-[13px] text-accent-rose">{error}</p>
          )}
          {!error && !loading && rows.length === 0 && (
            <p className="py-16 text-center text-[13px] text-ink-400">
              No records match your search.
            </p>
          )}
          {!error && rows.length > 0 && (
            <DataTable columns={columns} rows={rows} rowKey={rowKey} />
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-surface-border px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-ink-400">
            {total > 0
              ? `${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${total.toLocaleString()}`
              : "0 results"}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 text-[12.5px] font-medium text-ink-900 transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-[12px] text-ink-400">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 text-[12.5px] font-medium text-ink-900 transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
