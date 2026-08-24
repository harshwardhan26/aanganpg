import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  
  // Strict authorization check for this page only
  if (session?.user?.email !== "hppatilhpp@gmail.com") {
    redirect("/admin/listings");
  }

  const [totalUsers, verifiedLeads, activeLogins] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { phone: { not: null } } }),
    prisma.session.count({ where: { expires: { gt: new Date() } } }),
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold font-heading text-text-main">Analytics</h2>
        <a 
          href="https://us.i.posthog.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors border border-slate-300"
        >
          View Full Traffic on PostHog
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between h-32">
          <h3 className="text-sm font-semibold text-text-muted">Total Registered Users</h3>
          <p className="text-4xl font-bold font-heading text-primary-strong">{totalUsers}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between h-32">
          <h3 className="text-sm font-semibold text-text-muted">Verified Leads</h3>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold font-heading text-primary-strong">{verifiedLeads}</p>
            <span className="text-sm text-text-muted font-medium">with phone number</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between h-32">
          <h3 className="text-sm font-semibold text-text-muted">Active Sessions</h3>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold font-heading text-primary-strong">{activeLogins}</p>
            <span className="text-sm text-text-muted font-medium">currently logged in</span>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">How to view website visitors</h3>
        <p className="text-slate-600 text-sm leading-relaxed max-w-3xl">
          Detailed website traffic, including how many unique people visited the homepage, which pages they looked at, and what buttons they clicked, is automatically tracked by PostHog.
          <br /><br />
          Click the <strong>&quot;View Full Traffic on PostHog&quot;</strong> button above to log into your PostHog dashboard where all traffic data is securely stored.
        </p>
      </div>
    </div>
  );
}
