"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { safeCallbackUrl } from "@/lib/session";
import { signIn } from "next-auth/react";
import { UtensilsCrossed, Store, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/**
 * The mess site's front door.
 *
 * Two doors, one key. Both buttons run the same Google sign-in and grant exactly
 * the same thing — nothing. What a person may open is decided entirely by the
 * database: a `MessMember` row makes you staff, an email on a roll makes you a
 * student, `ADMIN_EMAILS` makes you Aangan. `/mess-home` reads that and sends
 * you on.
 *
 * The callback is `/mess-home`, never `/`. On the mess host they are the same
 * page — the host rewrites one to the other — and nobody stays on it either
 * way, because a signed-in person is redirected straight to their dashboard.
 * But on localhost and on preview deployments `/` is the *room* site's home
 * page, and sending someone there after a mess sign-in drops them on hostel
 * listings.
 *
 * So `?as=` is not a permission and must never become one. It survives the round
 * trip to Google for one reason: when we cannot find the person afterwards, the
 * two answers are completely different — a student needs to ask their mess to
 * add their Gmail, an owner needs to ask Aangan to set their mess up. Guessing
 * wrong there sends someone to the wrong person for help.
 */
export function MessLogin({
  label = "Sign in",
  className,
  callbackUrl,
}: {
  label?: string;
  className?: string;
  /** Where to return after Google. Sanitised; anything off-site is ignored. */
  callbackUrl?: string;
}) {
  const [open, setOpen] = useState(false);

  // A caller's destination wins, then one already on the URL — `proxy.ts` puts
  // it there when it turns somebody away — then the front door.
  const back = (as: "student" | "owner") => {
    const fromUrl =
      typeof window === "undefined"
        ? null
        : safeCallbackUrl(new URLSearchParams(window.location.search).get("callbackUrl"), window.location.origin);
    const target =
      (typeof window === "undefined"
        ? callbackUrl
        : safeCallbackUrl(callbackUrl ?? null, window.location.origin)) ?? fromUrl;
    return target ?? `/mess-home?as=${as}`;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* The trigger renders its own button rather than wrapping a child: this
          Sheet is Base UI, which composes with `render`, not `asChild`. */}
      {/* Filled by default, because on the page itself this is the one thing to
          do. The navbar passes its own quieter class: a red block in the bar was
          shouting over the headline it sits above. */}
      <SheetTrigger
        className={cn(
          "inline-flex cursor-pointer items-center justify-center rounded-xl font-semibold transition-colors",
          className ??
            "min-h-14 bg-primary-strong px-7 text-lg text-white hover:bg-primary-hover",
        )}
      >
        {label}
      </SheetTrigger>
      {/* A sheet, not a centre modal: it is what the room site's sign-in already
          is, and on a phone it opens under the thumb rather than under the
          notch. */}
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-2xl bg-white p-6 outline-none">
        <SheetTitle className="font-heading text-2xl font-bold text-text-main">
          Who are you?
        </SheetTitle>
        <p className="text-base text-text-muted">Both open Google. Pick the one that is you.</p>

        <div className="mt-2 flex flex-col gap-3">
          <Door
            icon={<UtensilsCrossed className="h-6 w-6" aria-hidden />}
            title="I eat at a mess"
            detail="See today's food, mark your meal, check your fees"
            onClick={() => signIn("google", { callbackUrl: back("student") })}
          />
          <Door
            icon={<Store className="h-6 w-6" aria-hidden />}
            title="I run a mess"
            detail="Who came today, fees, food menu"
            onClick={() => signIn("google", { callbackUrl: back("owner") })}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Door({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-20 w-full cursor-pointer items-center gap-4 rounded-2xl border border-border bg-white p-4 text-left transition-all duration-300 hover:border-primary-strong/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-primary-strong transition-colors group-hover:bg-primary-strong/10">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-lg font-bold text-text-main">{title}</span>
        <span className="block text-sm text-text-muted">{detail}</span>
      </span>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 group-hover:translate-x-0.5"
        aria-hidden
      />
    </button>
  );
}
