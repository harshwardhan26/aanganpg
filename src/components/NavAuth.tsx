"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Heart, LogOut, LayoutDashboard } from "lucide-react";
import { useAuthSheet } from "@/components/auth/AuthSheet";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The navbar's login control.
 *
 * A button rather than a /login route: signing in opens a sheet over whatever
 * the student was reading, so a half-read listing is never lost to a page
 * navigation. The navbar itself stays a server component; only this bit is
 * client-side.
 */
export function NavAuth({ className, mode = "all" }: { className?: string, mode?: "all" | "login-only" | "authenticated-only" }) {
  const { data: session, status } = useSession();
  const { openAuthSheet } = useAuthSheet();
  const isAdmin = (session?.user as any)?.role === "admin";

  if (status === "authenticated") {
    if (mode === "login-only") return null;
    return (
      <>
        {isAdmin && (
          <Link
            href="/admin/listings"
            className={cn(buttonVariants({ variant: "ghost" }), "gap-2 justify-start px-4 text-primary-strong", className)}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        )}
        <Link
          href="/saved"
          className={cn(buttonVariants({ variant: "ghost" }), "gap-2 justify-start px-4", className)}
        >
          <Heart className="h-4 w-4" />
          Saved
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className={cn(buttonVariants({ variant: "ghost" }), "gap-2 justify-start px-4 text-text-muted", className)}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </>
    );
  }

  if (mode === "authenticated-only") return null;

  if (mode === "login-only") {
    return (
      <button
        type="button"
        onClick={() => openAuthSheet()}
        className={cn(buttonVariants({ variant: "ghost" }), "text-primary-strong hover:bg-primary-strong/10 font-semibold", className)}
      >
        Login
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openAuthSheet()}
      className={cn(buttonVariants({ variant: "default" }), "bg-primary-strong text-white hover:bg-primary-hover", className)}
    >
      Login
    </button>
  );
}
