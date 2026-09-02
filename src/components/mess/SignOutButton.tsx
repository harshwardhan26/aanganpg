"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One sign-out control for the whole mess site.
 *
 * Shared rather than written per header, because the two places it appears —
 * the student bar and the owner's dashboard — must send a person to the same
 * place. Signing out lands on `/`, which is the front door on this host.
 */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-medium text-text-muted transition-colors hover:bg-slate-100 hover:text-text-main",
        className,
      )}
    >
      <LogOut className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">Sign out</span>
      <span className="sr-only sm:hidden">Sign out</span>
    </button>
  );
}
