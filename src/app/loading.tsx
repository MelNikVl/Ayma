export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-surface-2" />
        ))}
      </div>
      <div className="mt-6 h-8 w-48 animate-pulse rounded bg-surface-2" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card h-64 animate-pulse p-5">
            <div className="flex gap-3">
              <div className="h-14 w-14 rounded-xl bg-surface-2" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-surface-2" />
                <div className="h-3 w-full rounded bg-surface-2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
