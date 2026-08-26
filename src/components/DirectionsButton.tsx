"use client";

import { useSession } from "next-auth/react";
import { MapPin } from "lucide-react";
import { useAuthSheet } from "@/components/auth/AuthSheet";
import { directionsUrl } from "@/lib/maps";
import { cn } from "@/lib/utils";

const BUTTON_CLASS =
  "mt-3 flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium text-text-main shadow-sm transition-colors hover:bg-slate-50";

/**
 * Directions, behind the sign-in gate.
 *
 * The listing page is statically prerendered, so this check cannot happen on
 * the server without making the page dynamic and giving up the LCP budget the
 * whole page is built around. It is the same client-side shape the Call and
 * WhatsApp buttons already use.
 *
 * Signing in with Google is a full-page redirect, so there is no callback to
 * run afterwards — the student lands back on this URL authenticated and the
 * button is simply a link by then. That is why nothing here tries to reopen the
 * map for them.
 */
export function DirectionsButton({
  lat,
  lng,
  className,
}: {
  lat: number | null;
  lng: number | null;
  className?: string;
}) {
  const { status } = useSession();
  const { openAuthSheet } = useAuthSheet();

  const url = directionsUrl(lat, lng);
  if (!url) return null;

  // Neither state yet — render the signed-out label rather than flashing the
  // link and taking it away, which reads as a bug.
  if (status !== "authenticated") {
    return (
      <button
        type="button"
        onClick={() => openAuthSheet()}
        className={cn(BUTTON_CLASS, className)}
        disabled={status === "loading"}
      >
        <MapPin className="h-4 w-4" />
        Sign in for directions
      </button>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(BUTTON_CLASS, className)}
    >
      <MapPin className="h-4 w-4" />
      Get directions
    </a>
  );
}
