"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";
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
export function NavAuth({ className }: { className?: string }) {
  const { status } = useSession();
  const { openAuthSheet } = useAuthSheet();

  if (status === "authenticated") {
    return (
      <Link
        href="/saved"
        className={cn(buttonVariants({ variant: "ghost" }), "gap-2", className)}
      >
        <Heart className="h-4 w-4" />
        Saved
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openAuthSheet()}
      className={cn(buttonVariants({ variant: "ghost" }), className)}
    >
      Login
    </button>
  );
}
