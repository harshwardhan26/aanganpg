import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ExternalLink } from "lucide-react";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isOwner } from "@/lib/admin";
import { cn } from "@/lib/utils";

export const metadata = { title: "Numbers" };

/**
 * The owner's page.
 *
 * It used to show registered users, users-with-a-phone and unexpired sessions —
 * three numbers that go up on their own and describe nothing anybody decides
 * about. What matters is whether enquiries turn into move-ins, and which
 * colleges and listings produce them.
 */
export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);

  // Stricter than the admin gate: this page is the owner's alone.
  if (!isOwner(session?.user?.email)) {
    redirect("/admin/listings");
  }

  // Scoped to students, like every count on /admin. An owner being pitched is
  // not demand the site produced, and mixing the two into one denominator makes
  // the conversion rate on this page describe nothing anybody decides about.
  const student = { kind: "student" } as const;

  const [totalLeads, converted, lost, byCollege, topListings] = await Promise.all([
    prisma.lead.count({ where: student }),
    prisma.lead.count({ where: { ...student, stage: "CONVERTED" } }),
    prisma.lead.count({ where: { ...student, stage: "LOST" } }),
    prisma.college.findMany({
      select: {
        id: true,
        name: true,
        shortName: true,
        properties: {
          select: { _count: { select: { leads: true } } },
        },
      },
    }),
    prisma.property.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        title: true,
        _count: { select: { leads: true } },
      },
      orderBy: { leads: { _count: "desc" } },
      take: 10,
    }),
  ]);

  // Prisma has no "count leads through properties, grouped by college" in one
  // query, so the sum happens here. There are 15 colleges — this is a loop over
  // a fixed, tiny list, not a scan.
  const collegeRows = byCollege
    .map((c) => ({
      id: c.id,
      label: c.shortName || c.name,
      leads: c.properties.reduce((sum, p) => sum + p._count.leads, 0),
    }))
    .filter((c) => c.leads > 0)
    .sort((a, b) => b.leads - a.leads);

  const openLeads = totalLeads - converted - lost;
  const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;
  const maxCollegeLeads = collegeRows[0]?.leads ?? 0;
  const maxListingLeads = topListings[0]?._count.leads ?? 0;

  const headline = [
    { label: "Enquiries, all time", value: totalLeads, tone: "" },
    { label: "Moved in", value: converted, tone: "text-green-800" },
    { label: "Still open", value: openLeads, tone: "" },
    { label: "Conversion", value: `${conversionRate}%`, tone: "text-primary-strong" },
  ];

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-text-main">Numbers</h1>
        <a
          href="https://us.i.posthog.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium text-text-main hover:bg-slate-50"
        >
          Traffic on PostHog
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {headline.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-white p-4">
            <p className="text-xs font-medium text-text-muted">{card.label}</p>
            <p className={cn("mt-1 font-heading text-3xl font-bold text-text-main", card.tone)}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-text-muted">
          Enquiries by college
        </h2>
        {collegeRows.length > 0 ? (
          <ul className="space-y-2 rounded-xl border border-border bg-white p-4">
            {collegeRows.map((row) => (
              <li key={row.id} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-sm text-text-main">{row.label}</span>
                {/* A bar, not a chart library. One div and a percentage width. */}
                <span className="h-6 flex-1 overflow-hidden rounded bg-slate-100">
                  <span
                    className="block h-full rounded bg-primary-strong"
                    style={{ width: `${Math.max(4, (row.leads / maxCollegeLeads) * 100)}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right text-sm font-bold text-text-main">
                  {row.leads}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-border bg-white p-6 text-center text-text-muted">
            No enquiries yet.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-text-muted">
          Listings pulling the most enquiries
        </h2>
        {maxListingLeads > 0 ? (
          <ul className="divide-y divide-border rounded-xl border border-border bg-white">
            {topListings
              .filter((p) => p._count.leads > 0)
              .map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/listings/${p.id}/edit`}
                    className="flex min-h-14 items-center justify-between gap-3 px-4 hover:bg-slate-50"
                  >
                    <span className="min-w-0 truncate text-sm text-text-main">{p.title}</span>
                    <span className="shrink-0 font-heading font-bold text-text-main">
                      {p._count.leads}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-border bg-white p-6 text-center text-text-muted">
            No enquiries yet.
          </p>
        )}
      </section>

      <p className="text-sm leading-relaxed text-text-muted">
        These are enquiries — students who tapped Call or WhatsApp. Page views, which
        pages they looked at and where they came from live in PostHog, not here.
      </p>
    </div>
  );
}
