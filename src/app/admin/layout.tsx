import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isOwner } from "@/lib/admin";
import { AdminNav } from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-border bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/admin" className="font-heading text-xl font-bold text-text-main">
            Aangan Admin
          </Link>
          <AdminNav isOwner={isOwner(session?.user?.email)} />
        </div>
      </header>

      {/*
        * The bottom reserve is the tab bar's own height, from the `--admin-tabbar-h`
        * token, plus a gap. Without it the bar covers the last row of every page —
        * the same bug the listing page had.
        */}
      <main className="mx-auto max-w-7xl px-4 pt-6 pb-[calc(var(--admin-tabbar-h)+1.5rem)] sm:px-6 lg:px-8 lg:pb-10">
        {children}
      </main>
    </div>
  );
}
