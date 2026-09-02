"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Logo } from "@/components/Logo";
import { initials } from "@/lib/name";
import { MessLogin } from "./MessLogin";
import { SignOutButton } from "./SignOutButton";

/**
 * The mess site's navbar.
 *
 * Same mark as aanganpg.com, on purpose — it is the same company, and a mess
 * owner who was shown the room site should recognise this one. What it does not
 * carry is the room site's links: there is nothing to browse here, so the bar
 * holds the brand and the one thing a visitor can do.
 */
/**
 * `name` is the one the mess typed on its roll, passed down from the layout —
 * not the name on the Google account. A student is known to their mess by what
 * the owner wrote at admission, and an avatar showing anything else is a
 * stranger's initials on their own screen.
 */
export function MessNavbar({ name }: { name?: string | null }) {
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";
  const shown = name?.trim() || session?.user?.name || "";
  const mark = initials(shown);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-light/95 backdrop-blur supports-[backdrop-filter]:bg-light/60">
      <div className="mx-auto flex h-16 w-full max-w-[var(--content-max)] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex w-fit items-center gap-2.5 py-2 text-primary-strong">
          <Logo height={32} />
          <span className="mt-0.5 hidden text-xs font-semibold tracking-wide text-text-muted sm:inline-block">
            Mess
          </span>
        </Link>

        {status === "authenticated" ? (
          <div className="flex items-center gap-2">
            {mark && (
              <span
                title={shown}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-strong/10 font-heading text-sm font-bold tracking-wide text-primary-strong"
              >
                {mark}
                <span className="sr-only">Signed in as {shown}</span>
              </span>
            )}
            <Link
              href={isAdmin ? "/mess-admin" : "/"}
              className="flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-text-main transition-colors hover:bg-slate-100"
            >
              {isAdmin ? "Console" : "My mess"}
            </Link>
            <SignOutButton />
          </div>
        ) : (
          <MessLogin label="Login" className="min-h-11 px-5 text-base" />
        )}
      </div>
    </header>
  );
}
