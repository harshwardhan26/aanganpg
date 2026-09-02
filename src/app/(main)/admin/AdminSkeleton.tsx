/**
 * Every admin page is dynamic — each one waits on Postgres before it can render
 * anything, and on a phone that wait is the whole first impression. One shared
 * skeleton shape rather than three copies: the pages differ in what fills the
 * cards, not in the fact that they are a heading over a stack of cards.
 */
export function AdminSkeleton({ label, cards = 4 }: { label: string; cards?: number }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200/70" />
        <div className="space-y-4">
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-white p-4 sm:p-5">
              <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200/70" />
              <div className="mt-3 h-4 w-1/3 animate-pulse rounded bg-slate-200/70" />
              <div className="mt-4 flex gap-2">
                <div className="h-11 flex-1 animate-pulse rounded-lg bg-slate-200/70" />
                <div className="h-11 flex-1 animate-pulse rounded-lg bg-slate-200/70" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
