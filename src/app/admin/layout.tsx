import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.phone || session.user.phone !== process.env.ADMIN_PHONE) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-border py-4 px-6 shadow-sm">
        <h1 className="text-xl font-bold font-heading text-text-main">Aangan Admin</h1>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
