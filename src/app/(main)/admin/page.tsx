import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import prisma from "@/lib/prisma";
import { buildLeadWhere } from "@/lib/lead-filters";
import { PG_MIN_PHOTOS, LEAD_STAGES } from "@/lib/property-options";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

/**
 * /admin was a 404: the only way into the admin was to already know the
 * /admin/leads or /admin/listings URL.
 *
 * Every number here links to the list that contains it. A count you cannot act
 * on is decoration — the three counts this page used to show (registered users,
 * users with a phone, unexpired sessions) went nowhere and described nothing
 * anybody does.
 */
export default async function AdminHomePage() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    overdue,
    dueToday,
    ownerOverdue,
    ownerDueToday,
    leadsThisWeek,
    leadsLastWeek,
    byStage,
    liveListings,
    drafts,
    thinOnPhotos,
    quietListings,
  ] = await Promise.all([
    prisma.lead.count({ where: buildLeadWhere("overdue", now, "student") }),
    prisma.lead.count({ where: buildLeadWhere("today", now, "student") }),
    prisma.lead.count({ where: buildLeadWhere("overdue", now, "owner") }),
    prisma.lead.count({ where: buildLeadWhere("today", now, "owner") }),
    // Scoped to students: owner outreach is not an enquiry and must not
    // inflate the number that says how much demand the site produced.
    prisma.lead.count({ where: { kind: "student", createdAt: { gte: weekAgo } } }),
    prisma.lead.count({ where: { kind: "student", createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.lead.groupBy({ by: ["stage"], where: { kind: "student" }, _count: true }),
    prisma.property.count({ where: { deletedAt: null, closedAt: null, verifiedAt: { not: null } } }),
    prisma.property.count({ where: { deletedAt: null, verifiedAt: null } }),
    // Below the publish minimum. These can never go live until someone shoots them.
    prisma.property.count({
      where: { deletedAt: null, images: { none: {} } },
    }),
    // Live, but nobody enquired all week.
    prisma.property.count({
      where: {
        deletedAt: null,
        closedAt: null,
        verifiedAt: { not: null },
        leads: { none: { createdAt: { gte: weekAgo } } },
      },
    }),
  ]);

  const stageCount = (stage: string) =>
    byStage.find((row) => row.stage === stage)?._count ?? 0;

  /** Everything with a deadline, both sides of the business. Loud when non-zero. */
  const todo = [
    {
      href: "/admin/leads?view=overdue",
      label: "Students overdue",
      value: overdue,
      urgent: overdue > 0,
    },
    {
      href: "/admin/leads?view=today",
      label: "Students due today",
      value: dueToday,
      urgent: false,
    },
    {
      href: "/admin/leads?kind=owner&view=overdue",
      label: "Owners overdue",
      value: ownerOverdue,
      urgent: ownerOverdue > 0,
    },
    {
      href: "/admin/leads?kind=owner&view=today",
      label: "Owners due today",
      value: ownerDueToday,
      urgent: false,
    },
  ];

  const weekDelta = leadsThisWeek - leadsLastWeek;

  const supply = [
    { href: "/admin/listings?view=live", label: "Live listings", value: liveListings },
    { href: "/admin/listings?view=draft", label: "Drafts not published", value: drafts },
    { href: "/admin/listings?view=all", label: "Listings with no photos yet", value: thinOnPhotos },
    { href: "/admin/listings?view=live", label: "Live but no leads in 7 days", value: quietListings },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-text-main">Dashboard</h1>
        <Link
          href="/admin/listings/new"
          className="flex min-h-11 items-center gap-2 rounded-lg bg-primary-strong px-4 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Add a listing
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-text-muted">
          To do
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {todo.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className={cn(
                "rounded-xl border bg-white p-5 transition-colors hover:border-slate-300",
                card.urgent ? "border-red-300 bg-red-50" : "border-border",
              )}
            >
              <p className="text-sm font-medium text-text-muted">{card.label}</p>
              <p
                className={cn(
                  "mt-1 font-heading text-3xl font-bold",
                  card.urgent ? "text-red-900" : "text-text-main",
                )}
              >
                {card.value}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-text-muted">
          Enquiries
        </h2>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="font-heading text-4xl font-bold text-text-main">{leadsThisWeek}</p>
          <p className="mt-1 text-sm text-text-muted">
            in the last 7 days
            {leadsLastWeek > 0 || leadsThisWeek > 0 ? (
              <>
                {" · "}
                <span
                  className={cn(
                    "font-semibold",
                    weekDelta > 0 ? "text-green-800" : weekDelta < 0 ? "text-red-800" : "",
                  )}
                >
                  {weekDelta > 0 ? "+" : ""}
                  {weekDelta}
                </span>{" "}
                vs the week before
              </>
            ) : null}
          </p>

          <ul className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            {LEAD_STAGES.map((stage) => (
              <li key={stage}>
                <Link
                  href={`/admin/leads?view=${stage}`}
                  className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-slate-50 px-3 text-sm text-text-main hover:bg-slate-100"
                >
                  <span className="capitalize">{stage.toLowerCase()}</span>
                  <span className="font-bold">{stageCount(stage)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-text-muted">
          Listings
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {supply.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-5 transition-colors hover:border-slate-300"
            >
              <span className="text-sm font-medium text-text-muted">{card.label}</span>
              <span className="flex items-center gap-2 font-heading text-2xl font-bold text-text-main">
                {card.value}
                <ArrowRight className="h-4 w-4 text-text-muted" />
              </span>
            </Link>
          ))}
        </div>
        <p className="text-xs text-text-muted">
          A listing needs {PG_MIN_PHOTOS} photos including the bathroom before it can be published.
        </p>
      </section>
    </div>
  );
}
