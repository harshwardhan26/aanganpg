import Link from "next/link";
import prisma from "@/lib/prisma";
import { LeadCard } from "./LeadCard";
import { AddOwnerLead } from "./AddOwnerLead";
import { HostelSearch } from "./HostelSearch";
import {
  parseLeadView,
  parseLeadKind,
  parseLeadGrouping,
  parseHostelSearch,
  buildLeadWhere,
  buildLeadOrderBy,
  groupByHostel,
  type LeadView,
  type LeadKind,
  type LeadGrouping,
} from "@/lib/lead-filters";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export const metadata = { title: "Leads" };

const PER_PAGE = 20;

/**
 * The chips, in the order they are useful.
 *
 * Overdue and Due today come first because they are the only two that represent
 * work with a deadline. The stage chips after them are for looking something up,
 * not for working a queue.
 */
const CHIPS: { view: LeadView; label: string }[] = [
  { view: "all", label: "All" },
  { view: "overdue", label: "Overdue" },
  { view: "today", label: "Due today" },
  { view: "NEW", label: "New" },
  { view: "CONTACTED", label: "Contacted" },
  { view: "VISITED", label: "Visited" },
  { view: "CONVERTED", label: "Converted" },
  { view: "LOST", label: "Lost" },
];

/** The same five stages mean different things when the person is an owner. */
const OWNER_CHIP_LABELS: Partial<Record<LeadView, string>> = {
  NEW: "To call",
  VISITED: "Met them",
  CONVERTED: "Listed",
  LOST: "Said no",
};

const EMPTY_COPY: Record<LeadKind, Partial<Record<LeadView, string>>> = {
  student: {
    overdue: "Nothing overdue. Every follow-up you set is still in the future.",
    today: "No calls due today.",
    all: "No enquiries yet. They appear here the moment a student taps Call or WhatsApp on a listing.",
  },
  owner: {
    overdue: "No owner is waiting on a call back.",
    today: "No owners to call today.",
    all: "No owners yet. Add one when a hostel owner says “come back in a few days”.",
  },
};

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AdminLeadsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const kind = parseLeadKind(searchParams.kind);
  const view = parseLeadView(searchParams.view);
  // Grouping is a student-side idea: an owner lead has no listing to group under.
  const grouping: LeadGrouping =
    kind === "student" ? parseLeadGrouping(searchParams.by) : "date";
  // Only honoured in the By hostel view, because that is the only place its box
  // is on screen. A term left in the URL after switching to By date would be an
  // invisible filter silently hiding leads.
  const search = grouping === "hostel" ? parseHostelSearch(searchParams.q) : "";
  const page = Math.max(1, Number(searchParams.page) || 1);

  // One `now` for the whole render, so the query and every badge agree on where
  // the day boundary is.
  const now = new Date();

  const [leads, total, overdueCount, todayCount, otherKindOverdue, hostelOptions] = await Promise.all([
    prisma.lead.findMany({
      where: buildLeadWhere(view, now, kind, search),
      orderBy: buildLeadOrderBy(view, grouping),
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        name: true,
        phone: true,
        kind: true,
        hostelName: true,
        stage: true,
        source: true,
        notes: true,
        followupDate: true,
        createdAt: true,
        property: {
          select: { id: true, title: true, slug: true, ownerName: true, ownerPhone: true },
        },
      },
    }),
    prisma.lead.count({ where: buildLeadWhere(view, now, kind, search) }),
    prisma.lead.count({ where: buildLeadWhere("overdue", now, kind) }),
    prisma.lead.count({ where: buildLeadWhere("today", now, kind) }),
    // The overdue count on the tab you are NOT looking at, so work waiting on
    // the other side of the switch is visible without going there.
    prisma.lead.count({
      where: buildLeadWhere("overdue", now, kind === "student" ? "owner" : "student"),
    }),
    // Suggestions for the search box: only hostels that actually have a student
    // lead, because suggesting a hostel with nothing behind it sends you to an
    // empty list. Fetched only when the box is on screen.
    grouping === "hostel"
      ? prisma.property.findMany({
          where: { leads: { some: { kind: "student" } } },
          select: { title: true },
          orderBy: { title: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const counts: Partial<Record<LeadView, number>> = {
    overdue: overdueCount,
    today: todayCount,
  };
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  /** This URL with any of kind / view / grouping / page swapped. */
  const href = (
    next: { kind?: LeadKind; view?: LeadView; by?: LeadGrouping; page?: number } = {},
  ) => {
    const k = next.kind ?? kind;
    const v = next.view ?? view;
    const b = next.by ?? grouping;
    const p = next.page ?? 1;
    const params = new URLSearchParams();
    if (k !== "student") params.set("kind", k);
    if (v !== "all") params.set("view", v);
    if (b !== "date" && k === "student") params.set("by", b);
    // Dropped unless the search box is still on screen, so a link can never
    // hand you a filtered list with nothing to say it is filtered.
    if (search && b === "hostel" && k === "student") params.set("q", search);
    if (p > 1) params.set("page", String(p));
    return `/admin/leads${params.toString() ? `?${params}` : ""}`;
  };

  const TABS: { kind: LeadKind; label: string }[] = [
    { kind: "student", label: "Students" },
    { kind: "owner", label: "Owners" },
  ];

  const grouped = grouping === "hostel" ? groupByHostel(leads) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-text-main">Leads</h1>
        {kind === "owner" && <AddOwnerLead />}
      </div>

      {/* Students | Owners. Two kinds of person, one pipeline, one screen. */}
      <div className="flex gap-1 rounded-xl border border-border bg-white p-1">
        {TABS.map((tab) => {
          const active = tab.kind === kind;
          const waiting = active ? 0 : otherKindOverdue;
          return (
            <Link
              key={tab.kind}
              href={href({ kind: tab.kind, view: "all", by: "date" })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors",
                active ? "bg-primary-strong text-white" : "text-text-muted hover:bg-slate-50",
              )}
            >
              {tab.label}
              {waiting > 0 && (
                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-900">
                  {waiting}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <p className="text-sm text-text-muted">
        {total}{" "}
        {kind === "owner"
          ? total === 1
            ? "owner"
            : "owners"
          : total === 1
            ? "person"
            : "people"}
        {pageCount > 1 ? ` · page ${page} of ${pageCount}` : ""}
      </p>

      {/* Horizontal scroll on a phone, wrapping from `sm` — the same pattern the
          college chips on the home page use. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
        {CHIPS.map(({ view: v, label }) => {
          const active = v === view;
          const count = counts[v];
          return (
            <Link
              key={v}
              href={href({ view: v })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
                active
                  ? "border-primary-strong bg-primary-strong text-white"
                  : "border-border bg-white text-text-muted hover:border-text-muted",
              )}
            >
              {(kind === "owner" && OWNER_CHIP_LABELS[v]) || label}
              {count !== undefined && count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs font-bold",
                    active ? "bg-white/25 text-white" : "bg-red-100 text-red-900",
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* By date | By hostel. Students only — an owner's hostel is not a listing
          yet, so there is nothing to group them under. */}
      {kind === "student" && (
        <div className="flex gap-2">
          {(["date", "hostel"] as LeadGrouping[]).map((g) => {
            const active = g === grouping;
            return (
              <Link
                key={g}
                href={href({ by: g })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium transition-colors",
                  active
                    ? "border-text-main bg-text-main text-white"
                    : "border-border bg-white text-text-muted hover:border-text-muted",
                )}
              >
                {g === "date" ? "By date" : "By hostel"}
              </Link>
            );
          })}
        </div>
      )}

      {/* The term lives in the URL like every other filter here, so a reload or
          a shared link keeps it. */}
      {kind === "student" && grouping === "hostel" && (
        <HostelSearch
          hostels={hostelOptions.map((p) => p.title)}
          defaultValue={search}
          view={view}
        />
      )}

      {/* An active search has to be visible and undoable in one tap — the chip
          counts above deliberately still describe the whole tab, so without
          this the numbers and the list look like they disagree. */}
      {search && (
        <Link
          href={`/admin/leads?by=hostel${view !== "all" ? `&view=${view}` : ""}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary-strong bg-primary-strong/10 px-4 text-sm font-medium text-primary-strong"
        >
          Hostel: {search}
          <X className="h-4 w-4" />
          <span className="sr-only">Clear hostel search</span>
        </Link>
      )}

      {leads.length === 0 ? (
        <p className="rounded-xl border border-border bg-white p-8 text-center text-text-muted">
          {search
            ? `No leads for a hostel matching “${search}”.`
            : (EMPTY_COPY[kind][view] ?? "No leads in this stage.")}
        </p>
      ) : grouped ? (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.key} className="space-y-3">
              <h2 className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
                <span className="truncate font-heading text-base font-bold text-text-main">
                  {group.title}
                </span>
                <span className="shrink-0 text-sm font-semibold text-text-muted">
                  {group.leads.length}
                </span>
              </h2>
              <div className="space-y-4">
                {group.leads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} now={now} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} now={now} />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label="Lead pages" className="flex items-center justify-between gap-4 pt-2">
          {page > 1 ? (
            <Link
              href={href({ page: page - 1 })}
              rel="prev"
              className="inline-flex min-h-11 items-center rounded-lg border border-border bg-white px-4 text-sm font-medium text-text-main hover:bg-slate-50"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-text-muted">
            {page} / {pageCount}
          </span>
          {page < pageCount ? (
            <Link
              href={href({ page: page + 1 })}
              rel="next"
              className="inline-flex min-h-11 items-center rounded-lg border border-border bg-white px-4 text-sm font-medium text-text-main hover:bg-slate-50"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
