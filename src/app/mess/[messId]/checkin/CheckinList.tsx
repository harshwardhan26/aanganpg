"use client";

import { useState, useTransition, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Check, Search } from "lucide-react";
import { toggleAttendance } from "@/actions/mess";
import { msUntilNextIstDay, MEAL_WINDOWS, type MealName } from "@/lib/mess";
import { cn } from "@/lib/utils";

type Row = { id: string; name: string; photoUrl: string | null; present: boolean };

/**
 * Keeps the screen awake while this page is open.
 *
 * A mounted tablet that sleeps every thirty seconds turns a one-tap check-in
 * into wake, unlock, tap. The lock is dropped by the browser whenever the tab
 * is hidden, so it has to be taken again on the way back — without that, the
 * screen stays awake only until the first time someone switches away.
 *
 * Unsupported browsers are a silent no-op: the page still works, the screen
 * just sleeps as usual.
 */
function useKioskScreen() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    let lock: WakeLockSentinel | null = null;
    let released = false;

    async function acquire() {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        // Denied on a backgrounded tab or a device with low battery. Not worth
        // telling anyone about — nothing they can do, and the page still works.
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible" && !released) acquire();
    }

    acquire();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, []);
}

/** Fires once, when the mess day rolls over at midnight IST. */
function useDayRollover(onRollover: () => void) {
  useEffect(() => {
    // A tablet left on this page for a week must not accumulate a week of
    // timers, so each one only schedules the next after it fires.
    let timer: ReturnType<typeof setTimeout>;

    function schedule() {
      // +1s so the reload lands after the boundary, never a millisecond before
      // it, which would reload into the same day and schedule a zero-length
      // timeout in a loop.
      timer = setTimeout(() => {
        onRollover();
        schedule();
      }, msUntilNextIstDay(new Date()) + 1000);
    }

    schedule();
    return () => clearTimeout(timer);
  }, [onRollover]);
}

export function CheckinList({
  messId,
  meal,
  students,
}: {
  messId: string;
  meal: MealName;
  students: Row[];
}) {
  const [rows, setRows] = useState(students);
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();
  const [failed, setFailed] = useState<string | null>(null);
  const router = useRouter();

  // The two things a tablet mounted at the entrance needs and a laptop does not.
  useKioskScreen();
  // Refresh only. The page keys this component on the day, so the new server
  // render replaces it outright — no local state to reset by hand, and none to
  // drift out of step with what the server now thinks "today" is.
  useDayRollover(
    // Stable identity, or the timer would be torn down and rescheduled on every
    // keystroke in the search box.
    useCallback(() => router.refresh(), [router]),
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, query]);

  const presentCount = rows.filter((r) => r.present).length;

  function toggle(row: Row) {
    // Flip first, reconcile after: at a mess door the tap has to feel instant,
    // and the server is the one that decides. A failure puts the row back
    // rather than leaving a tick nobody recorded.
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, present: !r.present } : r)));
    setFailed(null);

    startTransition(async () => {
      try {
        const { present } = await toggleAttendance(messId, row.id, meal);
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, present } : r)));
      } catch {
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, present: row.present } : r)));
        setFailed(row.name);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-2">
          {MEAL_WINDOWS.map((window) => (
            <Link
              key={window.meal}
              href={`/mess/${messId}/checkin?meal=${window.meal}`}
              aria-current={window.meal === meal ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center rounded-xl px-4 text-base font-semibold transition-colors",
                window.meal === meal
                  ? "bg-primary-strong text-white"
                  : "bg-muted text-text-muted hover:text-text-main",
              )}
            >
              {window.label}
            </Link>
          ))}
        </nav>
        <p className="text-base text-text-muted">
          <span className="font-heading text-xl font-bold tabular-nums text-text-main">
            {presentCount}
          </span>{" "}
          of <span className="tabular-nums">{rows.length}</span> came
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a name"
          aria-label="Search students by name"
          className="min-h-14 w-full rounded-xl border-2 border-border bg-white py-3 pr-3 pl-11 text-base outline-none focus:border-primary-strong"
        />
      </div>

      {failed && (
        <p role="alert" className="rounded-xl bg-red-100 px-4 py-3 text-base text-red-900">
          {failed} was not saved. Check the internet and tap again.
        </p>
      )}

      {visible.length === 0 ? (
        <p className="rounded-2xl border-2 border-border bg-white p-8 text-center text-base text-text-muted">
          {rows.length === 0 ? "No students yet. Add students first." : "No student with that name."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => toggle(row)}
                aria-pressed={row.present}
                className={cn(
                  "flex min-h-20 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-colors",
                  row.present
                    ? "border-primary-strong bg-primary-strong/10"
                    : "border-border bg-white hover:bg-muted",
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  {row.photoUrl ? (
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border">
                      <Image src={row.photoUrl} alt="" fill sizes="56px" className="object-cover" />
                    </span>
                  ) : (
                    <span className="h-14 w-14 shrink-0 rounded-full border-2 border-dashed border-border" />
                  )}
                  <span className="min-w-0 truncate text-lg font-semibold text-text-main">
                    {row.name}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2",
                    row.present
                      ? "border-primary-strong bg-primary-strong text-white"
                      : "border-border text-transparent",
                  )}
                >
                  <Check className="h-6 w-6" aria-hidden />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
