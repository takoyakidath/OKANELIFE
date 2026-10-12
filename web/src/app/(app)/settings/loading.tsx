export default function Loading() {
  return (
    <div className="flex flex-col gap-6 py-6" aria-busy="true">
      <div className="space-y-2">
        <div className="h-6 w-16 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-40 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-36 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
