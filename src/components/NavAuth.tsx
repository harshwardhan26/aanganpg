"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Heart, LogOut, LayoutDashboard, User, PlusCircle } from "lucide-react";
import { useAuthSheet } from "@/components/auth/AuthSheet";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  if (status === "authenticated") {
    if (mode === "login-only") return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className={cn("flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-strong", className)}>
          <User className="h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 mt-2 bg-white z-50 shadow-md border border-slate-200">
          {isAdmin && (
            <DropdownMenuItem className="p-0 cursor-pointer">
              <Link href="/admin/listings" className="flex items-center gap-2 w-full h-full px-2 py-1.5">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem className="p-0 cursor-pointer">
            <Link href="/saved" className="flex items-center gap-2 w-full h-full px-2 py-1.5">
              <Heart className="h-4 w-4" />
              Saved
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem className="p-0 cursor-pointer">
            <Link href="/list-your-pg" className="flex items-center gap-2 w-full h-full px-2 py-1.5 text-primary-strong">
              <PlusCircle className="h-4 w-4" />
              List Property — FREE
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            onClick={() => signOut({ callbackUrl: "/" })}
            className="cursor-pointer flex items-center gap-2 text-red-600 focus:text-red-700"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
