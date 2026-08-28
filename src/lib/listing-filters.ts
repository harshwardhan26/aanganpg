import { z } from "zod";
import type { Prisma } from "@prisma/client";

/**
 * The admin listing views.
 *
 * `all` deliberately still hides soft-deleted rows. The old page ran
 * `findMany` with no `where` at all, so every listing anyone had ever deleted
 * sat in the list at 50% opacity forever. Deleted rows are reachable, but only
 * by asking for them.
 */
export const LISTING_VIEWS = ["all", "live", "draft", "full", "closed", "deleted"] as const;
export type ListingView = (typeof LISTING_VIEWS)[number];

export function parseListingView(raw: string | string[] | undefined): ListingView {
  return z.enum(LISTING_VIEWS).catch("all").parse(raw);
}

/** A title search, capped. Becomes part of a query, so it cannot be unbounded. */
export function parseListingSearch(raw: string | string[] | undefined): string {
  return z.string().max(80).catch("").parse(raw).trim();
}

export function buildListingWhere(view: ListingView, search: string): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = {};

  if (view === "deleted") {
    where.deletedAt = { not: null };
  } else {
    where.deletedAt = null;
    if (view === "closed") {
      where.closedAt = { not: null };
    } else if (view === "draft") {
      // Not verified yet is what "draft" means here: `saveListing` stamps
      // `verifiedAt` on publish and nulls it on save-as-draft.
      where.verifiedAt = null;
    } else if (view === "full") {
      where.closedAt = null;
      where.vacantBeds = 0;
    } else if (view === "live") {
      where.closedAt = null;
      where.verifiedAt = { not: null };
      where.NOT = { vacantBeds: 0 };
    }
  }

  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }

  return where;
}

export type ListingStatus = "deleted" | "closed" | "full" | "draft" | "live";

/**
 * The one badge a listing gets, most severe first. Deleted beats closed beats
 * full: a deleted listing is also technically closed, and showing both says
 * nothing useful.
 */
export function listingStatus(p: {
  deletedAt: Date | null;
  closedAt: Date | null;
  verifiedAt: Date | null;
  vacantBeds: number | null;
}): ListingStatus {
  if (p.deletedAt) return "deleted";
  if (p.closedAt) return "closed";
  if (p.vacantBeds === 0) return "full";
  if (!p.verifiedAt) return "draft";
  return "live";
}
