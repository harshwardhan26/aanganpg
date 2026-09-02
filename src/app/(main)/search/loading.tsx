/**
 * `/search` is dynamic — it reads searchParams, so it cannot be prerendered and
 * every visit waits on Postgres. Without this the student taps a filter and
 * looks at the previous page, with nothing to say the tap registered.
 *
 * Skeleton cards rather than a spinner: they hold the layout the real results
 * will occupy, so nothing jumps when the data lands.
 */
export default function SearchLoading() {
  return (
    <main className="min-h-screen bg-light">
      <div className="max-w-[var(--content-max)] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-start gap-8">
        <aside className="hidden lg:block w-72 shrink-0 border-r border-border pr-8" aria-hidden="true">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-slate-200/70 animate-pulse" />
            ))}
          </div>
        </aside>

        <div className="flex-1 pb-24 lg:pb-8" aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading rooms…</span>

          <div className="mb-6 space-y-2" aria-hidden="true">
            <div className="h-8 w-64 rounded bg-slate-200/70 animate-pulse" />
            <div className="h-4 w-28 rounded bg-slate-200/70 animate-pulse" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-6" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-white overflow-hidden">
                <div className="aspect-[4/3] bg-slate-200/70 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-5 w-3/4 rounded bg-slate-200/70 animate-pulse" />
                  <div className="h-4 w-1/2 rounded bg-slate-200/70 animate-pulse" />
                  <div className="h-4 w-1/3 rounded bg-slate-200/70 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
