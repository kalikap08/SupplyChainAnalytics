function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl2 border border-surface-border bg-surface-card p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="h-3 w-24 rounded bg-surface-border" />
        <div className="h-9 w-9 rounded-lg bg-surface-border" />
      </div>
      <div className="mt-4 h-7 w-32 rounded bg-surface-border" />
      <div className="mt-2 h-3 w-40 rounded bg-surface-border" />
    </div>
  );
}

export default function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[0, 1, 2, 3].map((col) => (
            <SkeletonCard key={col} />
          ))}
        </div>
      ))}
    </div>
  );
}
