"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { MessLogin } from "./MessLogin";

/**
 * The mess site's navbar.
 *
 * Same mark as aanganpg.com, on purpose — it is the same company, and a mess
 * owner who was shown the room site should recognise this one. What it does not
 * carry is the room site's links: there is nothing to browse here, so the bar
 * holds the brand and the one thing a visitor can do.
 */
export function MessNavbar() {
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";

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
            <Link
              href={isAdmin ? "/mess-admin" : "/"}
              className="flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-text-main transition-colors hover:bg-slate-100"
            >
              {isAdmin ? "Console" : "My mess"}
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-medium text-text-muted transition-colors hover:bg-slate-100 hover:text-text-main"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
              <span className="sr-only sm:hidden">Sign out {session?.user?.name ?? ""}</span>
            </button>
          </div>
        ) : (
          <MessLogin label="Login" className="min-h-11 px-5 text-base" />
        )}
      </div>
    </header>
  );
}
