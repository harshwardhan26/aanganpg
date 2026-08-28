"use client";

import dynamic from "next/dynamic";
import type { RoomPin } from "./RoomMap";

/**
 * Loads the map on the client only.
 *
 * Leaflet reaches for `window` at module scope, so it cannot be prerendered —
 * and `ssr: false` is not allowed in a Server Component in this version of Next
 * ("`ssr: false` is not allowed with `next/dynamic` in Server Components. Please
 * move it into a Client Component." — `next/dist/docs/01-app/02-guides/
 * lazy-loading.md`). `/search` is a Server Component, so this thin client
 * wrapper is the move the docs are asking for.
 *
 * It also keeps Leaflet out of the bundle entirely for anyone who never opens
 * the map, which is most visitors.
 */
const RoomMap = dynamic(() => import("./RoomMap"), {
  ssr: false,
  loading: () => (
    <div
      className="h-[65vh] min-h-[380px] w-full animate-pulse rounded-xl border border-border bg-slate-200/70 lg:h-[calc(100vh-12rem)]"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading map…</span>
    </div>
  ),
});

export function RoomMapLoader({ pins }: { pins: RoomPin[] }) {
  return <RoomMap pins={pins} />;
}
