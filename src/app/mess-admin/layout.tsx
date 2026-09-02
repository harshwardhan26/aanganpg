import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { ArrowUpRight } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { getBaseUrl } from "@/lib/url";

export const metadata: Metadata = {
  title: { default: "Aangan Mess Admin", template: "%s | Aangan Mess Admin" },
  robots: { index: false, follow: false },
};

/**
 * Aangan's console for the mess business.
 *
 * Guards here so a new page under this folder is protected the moment it
 * exists — but every action re-checks, because a layout is not a lock.
 */
export default async function MessAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-border bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/mess-admin" className="flex items-center gap-2.5 text-primary-strong">
            <Logo height={28} />
            <span className="mt-0.5 text-xs font-semibold tracking-wide text-text-muted">
              Mess Admin
            </span>
          </Link>

          {/* The two products are two hosts. This is the only door between them. */}
          <a
            href={`${getBaseUrl()}/admin`}
            className="flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-text-muted transition-colors hover:bg-slate-100 hover:text-text-main"
          >
            Rooms admin
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
