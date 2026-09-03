import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { SkipLink } from "@/components/mess/SkipLink";

export const metadata: Metadata = {
  title: { default: "Aangan Mess Admin", template: "%s | Aangan Mess Admin" },
  robots: { index: false, follow: false },
};

/**
 * Aangan's console for the mess business.
 *
 * Guards here so a new page under this folder is protected the moment it
 * exists — but every action re-checks, because a layout is not a lock.
 *
 * Nothing here links to the room site, deliberately. The two products share a
 * deployment and a database, and neither is ever allowed to show that: a mess
 * owner sitting beside this screen must see a mess system, not a wing of a
 * hostel listing site. Aangan reaches the room admin by typing its own address.
 */
export default async function MessAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen bg-slate-50">
      <SkipLink />
      <header className="sticky top-0 z-30 border-b border-border bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6">
          <Link href="/mess-admin" className="flex items-center gap-2.5 text-primary-strong">
            <Logo height={28} />
            <span className="mt-0.5 text-xs font-semibold tracking-wide text-text-muted">
              Mess Admin
            </span>
          </Link>


        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
