import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  
  if (session?.user?.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-border py-4 px-4 sm:px-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link href="/admin" className="text-xl font-bold font-heading text-text-main">
          Aangan Admin
        </Link>
        <nav className="flex items-center gap-5 sm:gap-6 text-sm font-medium text-text-muted overflow-x-auto pb-1 sm:pb-0">
          <Link href="/admin/leads" className="hover:text-text-main whitespace-nowrap">Leads</Link>
          <Link href="/admin/listings" className="hover:text-text-main whitespace-nowrap">Listings</Link>
          <Link href="/admin/users" className="hover:text-text-main whitespace-nowrap">Users</Link>
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
