/** `/saved` is per-user, so it is dynamic and always waits on a query. */
export default function SavedLoading() {
  return (
    <main className="min-h-screen bg-light">
      <div className="max-w-[var(--content-max)] mx-auto px-4 sm:px-6 lg:px-8 py-8" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading your saved rooms…</span>
        <div className="h-8 w-52 rounded bg-slate-200/70 animate-pulse mb-6" aria-hidden="true" />
        <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-6" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-white overflow-hidden">
              <div className="aspect-[4/3] bg-slate-200/70 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-5 w-3/4 rounded bg-slate-200/70 animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-slate-200/70 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
