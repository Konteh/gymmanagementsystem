export function DashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading page" className="space-y-6">
      <span className="sr-only">Loading page</span>
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-64 max-w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-lg border bg-white" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg border bg-white" />
    </div>
  );
}