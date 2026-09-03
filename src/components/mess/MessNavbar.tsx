"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut, LayoutDashboard, UtensilsCrossed, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { initials } from "@/lib/name";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessLogin } from "./MessLogin";

/**
 * The mess site's navbar: the mark, and one control.
 *
 * Everything a signed-in person can do lives behind the avatar, the way it does
 * on the room site. A bar holding an avatar, a link and a sign-out icon side by
 * side spends three slots on a screen whose whole job is the card below it.
 *
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
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={shown ? `Account — ${shown}` : "Account"}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-primary-strong/10 font-heading text-sm font-bold tracking-wide text-primary-strong transition-colors hover:bg-primary-strong/15"
            >
              {mark || <User className="h-5 w-5" aria-hidden />}
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="z-50 mt-2 w-56 border border-border bg-white shadow-md"
            >
              {shown && (
                <>
                  <DropdownMenuLabel className="truncate">{shown}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem className="cursor-pointer p-0">
                <Link href="/" className="flex h-full w-full items-center gap-2 px-2 py-2.5">
                  {isAdmin ? (
                    <LayoutDashboard className="h-4 w-4" aria-hidden />
                  ) : (
                    <UtensilsCrossed className="h-4 w-4" aria-hidden />
                  )}
                  {isAdmin ? "Console" : "My mess"}
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex cursor-pointer items-center gap-2 py-2.5 text-red-700 focus:text-red-800"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <MessLogin
            label="Login"
            className="min-h-11 border border-border bg-white px-5 text-base text-text-main hover:bg-slate-100"
          />
        )}
      </div>
    </header>
  );
}
