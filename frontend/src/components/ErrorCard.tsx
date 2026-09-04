import { IconAlert } from "@/components/icons";

interface ErrorCardProps {
  message: string;
  onRetry: () => void;
}

export default function ErrorCard({ message, onRetry }: ErrorCardProps) {
  return (
    <div className="flex flex-col items-center rounded-xl2 border border-surface-border bg-surface-card px-8 py-14 text-center shadow-card">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-rose/10 text-accent-rose">
        <IconAlert width={22} height={22} />
      </span>
      <h3 className="mt-4 text-[16px] font-semibold text-ink-900">
        Unable to load data
      </h3>
      <p className="mt-1.5 max-w-sm text-[13.5px] text-ink-600">
        Check that the FastAPI backend is running.
      </p>
      <p className="mt-1 max-w-sm text-[12px] text-ink-400">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-lg bg-navy-900 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-navy-800"
      >
        Retry
      </button>
    </div>
  );
}
