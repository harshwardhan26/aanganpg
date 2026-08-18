import Link from "next/link";
import prisma from "@/lib/prisma";

/**
 * /admin was a 404: the only way into the admin was to already know the
 * /admin/leads or /admin/listings URL.
 */
export default async function AdminHomePage() {
  const [newLeads, totalLeads, liveListings, unverified] = await Promise.all([
    prisma.lead.count({ where: { status: "New" } }),
    prisma.lead.count(),
    prisma.property.count({ where: { deletedAt: null, closedAt: null } }),
    prisma.property.count({ where: { deletedAt: null, verifiedAt: null } }),
  ]);

  const cards = [
    { href: "/admin/leads", label: "New leads", value: newLeads, hint: `${totalLeads} all time` },
    { href: "/admin/listings", label: "Live listings", value: liveListings, hint: `${unverified} not verified yet` },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-heading text-text-main">Dashboard</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white rounded-xl border border-border shadow-sm p-6 hover:border-slate-300 transition-colors"
          >
            <p className="text-sm font-medium text-text-muted">{card.label}</p>
            <p className="mt-2 text-4xl font-bold font-heading text-text-main">{card.value}</p>
            <p className="mt-1 text-sm text-text-muted">{card.hint}</p>
          </Link>
        ))}
      </div>

      <Link
        href="/admin/listings/new"
        className="inline-block bg-primary-strong text-white font-semibold rounded-lg px-5 py-3 hover:bg-primary-hover"
      >
        Add a listing
      </Link>
    </div>
  );
}
