"use client";

import { IconRefresh } from "@/components/icons";
import { formatTimestamp } from "@/lib/format";
import UploadDataModal from "@/components/UploadDataModal";

interface HeaderProps {
  title: string;
  subtitle: string;
  lastUpdated: Date | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function Header({
  title,
  subtitle,
  lastUpdated,
  onRefresh,
  isRefreshing,
}: HeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-surface-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink-900">
          {title}
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-600">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[12px] text-ink-400">
          {lastUpdated
            ? `Last updated ${formatTimestamp(lastUpdated)}`
            : "Not yet loaded"}
        </span>
        <UploadDataModal />
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3.5 py-2 text-[13px] font-medium text-ink-900 shadow-card transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          <IconRefresh
            width={15}
            height={15}
            className={isRefreshing ? "animate-spin" : ""}
          />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </div>
  );
}
