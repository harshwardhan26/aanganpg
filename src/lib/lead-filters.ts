import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { LEAD_STAGES } from "./property-options";

/**
 * Students enquiring about rooms, and hostel owners being pitched.
 *
 * Two kinds, one pipeline. An owner goes found -> spoke -> met -> listed -> no,
 * which is the same five stages a student goes through, so `LEAD_STAGES`,
 * `followupDate`, `notes` and every view below work unchanged for both.
 */
export const LEAD_KINDS = ["student", "owner"] as const;
export type LeadKind = (typeof LEAD_KINDS)[number];

export function parseLeadKind(raw: string | string[] | undefined): LeadKind {
  return z.enum(LEAD_KINDS).catch("student").parse(raw);
}

/**
 * The views the lead inbox offers, as URL values.
 *
 * `all` is the inbox — newest first, which is what you want when someone has
 * just filled the form. `today` and `overdue` are the follow-up queue, a
 * different job with a different order (soonest due first). The five stage
 * values come from `LEAD_STAGES` rather than being retyped here; a stage that
 * exists in one list and not the other is a filter that silently matches
 * nothing.
 */
export const LEAD_VIEWS = ["all", "today", "overdue", ...LEAD_STAGES] as const;
export type LeadView = (typeof LEAD_VIEWS)[number];

/**
 * A URL's worth of view, sanitised. Falls back to `all` rather than throwing,
 * for the same reason `parseRoomFilters` does: a hand-edited query string must
 * render an unfiltered page, never a 500.
 */
export function parseLeadView(raw: string | string[] | undefined): LeadView {
  return z.enum(LEAD_VIEWS).catch("all").parse(raw);
}

/** How the student inbox is arranged: by when, or under each hostel. */
export const LEAD_GROUPINGS = ["date", "hostel"] as const;
export type LeadGrouping = (typeof LEAD_GROUPINGS)[number];

export function parseLeadGrouping(raw: string | string[] | undefined): LeadGrouping {
  return z.enum(LEAD_GROUPINGS).catch("date").parse(raw);
}

/**
 * A hostel-name search, capped. Becomes part of a query, so it cannot be
 * unbounded; an over-long term falls back to no search rather than throwing,
 * the same way every other parser here handles a hand-edited URL.
 */
export function parseHostelSearch(raw: string | string[] | undefined): string {
  return z.string().max(80).catch("").parse(raw).trim();
}

/**
 * Midnight UTC on the day `now` falls in.
 *
 * `followupDate` is written by the lead card as `new Date("2026-08-26")`, which
 * JavaScript parses as UTC midnight. Comparing it against a *local* midnight —
 * which is what the old row component did with `setHours(0,0,0,0)` — puts the
 * boundary 5h30m off in IST, so a lead due today reads as overdue for half the
 * day. The query and the badge both call this, so they cannot disagree.
 */
export function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** A follow-up on a won or lost lead is not work; both views exclude them. */
const OPEN_STAGES = { stage: { notIn: ["CONVERTED", "LOST"] } };

export function buildLeadWhere(
  view: LeadView,
  now: Date,
  kind: LeadKind = "student",
  search = "",
): Prisma.LeadWhereInput {
  const todayStart = startOfUtcDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  // Matches the hostel a student enquired about. A lead with no property cannot
  // match a hostel name, so searching correctly drops it.
  const hostel: Prisma.LeadWhereInput = search
    ? { property: { title: { contains: search, mode: "insensitive" } } }
    : {};

  if (view === "today") {
    return { kind, ...hostel, followupDate: { gte: todayStart, lt: tomorrowStart }, ...OPEN_STAGES };
  }
  if (view === "overdue") {
    return { kind, ...hostel, followupDate: { lt: todayStart }, ...OPEN_STAGES };
  }
  if (view === "all") {
    return { kind, ...hostel };
  }
  return { kind, ...hostel, stage: view };
}

/**
 * The follow-up queue is ordered by when the call is due; every other view is
 * an inbox, ordered newest first. Grouping by hostel overrides both: the rows
 * have to arrive sorted by hostel for the render to gather them into runs.
 */
export function buildLeadOrderBy(
  view: LeadView,
  grouping: LeadGrouping = "date",
): Prisma.LeadOrderByWithRelationInput[] {
  if (grouping === "hostel") {
    return [{ property: { title: "asc" } }, { createdAt: "desc" }];
  }
  if (view === "today" || view === "overdue") {
    return [{ followupDate: "asc" }, { createdAt: "desc" }];
  }
  return [{ createdAt: "desc" }];
}

/**
 * Gather a hostel-sorted list into runs, one per hostel.
 *
 * Consecutive runs rather than a map keyed by id, because the rows already
 * arrive sorted by hostel — and because a hostel straddling a page boundary
 * should simply show its heading again on the next page, which falling out of
 * a run does for free.
 */
export function groupByHostel<T extends { property: { id: string; title: string } | null }>(
  leads: T[],
): { key: string; title: string; leads: T[] }[] {
  const groups: { key: string; title: string; leads: T[] }[] = [];
  for (const lead of leads) {
    const key = lead.property?.id ?? "none";
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.leads.push(lead);
    } else {
      groups.push({ key, title: lead.property?.title ?? "No hostel", leads: [lead] });
    }
  }
  return groups;
}

/** Whether a lead's follow-up is in the past / due today. Shared by card and counts. */
export function followupState(
  followupDate: Date | null,
  stage: string,
  now: Date,
): "overdue" | "today" | "upcoming" | "none" {
  if (!followupDate) return "none";
  if (stage === "CONVERTED" || stage === "LOST") return "none";
  const todayStart = startOfUtcDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  if (followupDate < todayStart) return "overdue";
  if (followupDate < tomorrowStart) return "today";
  return "upcoming";
}
