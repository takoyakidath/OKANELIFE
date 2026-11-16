export default function Loading() {
  return (
    <div className="flex flex-col gap-6 py-6" aria-busy="true">
      <div className="h-6 w-32 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-56 animate-pulse rounded-md bg-muted" />
      <div className="flex flex-col gap-2">
        <div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="size-9 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
