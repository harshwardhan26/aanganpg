"use client";

import { useSyncExternalStore } from "react";

/**
 * The date and a ticking time, in IST.
 *
 * A clock is an external, always-changing source rather than component state, so
 * it is read with `useSyncExternalStore`: subscribe ticks once a second, and the
 * snapshot is the current second — a value that stays identical between renders
 * inside the same second, which is what stops React re-rendering in a loop.
 *
 * The server snapshot is null: a time rendered on the server is already stale by
 * the time the phone shows it, and rendering one would be a hydration mismatch.
 */
function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, 1000);
  return () => clearInterval(timer);
}

export function LiveClock() {
  const second = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 1000),
    () => null,
  );

  const now = second === null ? null : new Date(second * 1000);

  const format = (options: Intl.DateTimeFormatOptions) =>
    now?.toLocaleString("en-IN", { ...options, timeZone: "Asia/Kolkata" }) ?? " ";

  return (
    <div className="text-center">
      <p className="font-heading text-3xl font-bold tabular-nums text-text-main">
        {format({ hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
      </p>
      <p className="text-sm text-text-muted">
        {format({ weekday: "short", day: "numeric", month: "short", year: "numeric" })}
      </p>
    </div>
  );
}
