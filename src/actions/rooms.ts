"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { buildRoomWhere, buildRoomOrderBy, roomFiltersSchema, type RoomFilters } from "@/lib/room-filters";

export type { RoomFilters };

const slugSchema = z.string().min(1);

/**
 * Rooms per page. One screenful of scrolling on a phone, not a wall.
 *
 * Not exported: every export of a `"use server"` module must be an async
 * function, and exporting this constant silently stripped the module of all its
 * exports at build time.
 */
const PAGE_SIZE = 24;

/**
 * One page of rooms, plus whether there is another.
 *
 * `take: 50` used to be a ceiling rather than a page: the 51st listing was
 * unreachable from any URL, which is a silent cap the moment Kolhapur has more
 * than fifty rooms. Fetching PAGE_SIZE + 1 answers "is there a next page"
 * without a second count query.
 */
export async function getRooms(filters: RoomFilters = {}, page = 1) {
  const parsed = roomFiltersSchema.safeParse(filters);
  if (!parsed.success) throw new Error("Invalid filters");

  const current = Math.max(1, Math.trunc(page));
  const rows = await prisma.property.findMany({
    where: buildRoomWhere(parsed.data),
    skip: (current - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    // No `reviews` include: the card renders `ratingAvg`/`ratingCount`, which
    // are columns on Property. Including reviews meant every review of every
    // listing crossed the wire to produce one number per card.
    include: { college: true, images: true },
    orderBy: buildRoomOrderBy(parsed.data),
  });

  return { rooms: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE, page: current };
}

/**
 * Closed listings still resolve.
 *
 * A rented-out room keeps its page and says so, because the link is already out
 * there in forwarded WhatsApp messages — 404ing it turns a share into a dead
 * end. Only soft-deleted rows disappear.
 */
export async function getRoomBySlug(slug: string) {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return null;
  return prisma.property.findUnique({
    where: { slug: parsed.data, deletedAt: null },
    include: { college: true, images: true },
  });
}

/** Slugs of every listing that still has a page, for prerendering. */
export async function getRoomSlugs() {
  const rooms = await prisma.property.findMany({
    where: { deletedAt: null },
    select: { slug: true },
  });
  return rooms.map((r) => r.slug);
}

export async function getColleges() {
  return prisma.college.findMany({ orderBy: { name: "asc" } });
}

export async function getCollegeBySlug(slug: string) {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return null;
  return prisma.college.findUnique({ where: { slug: parsed.data } });
}

/** First page only. Both callers render a short "nearby" strip, never a list. */
export async function getRoomsNearCollege(slug: string) {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return [];
  return (await getRooms({ college: parsed.data })).rooms;
}

export async function getLocations() {
  const rooms = await prisma.property.findMany({
    where: { deletedAt: null, closedAt: null, location: { not: null } },
    select: { location: true },
    distinct: ["location"],
  });
  return rooms
    .map((r) => r.location as string)
    .sort((a, b) => a.localeCompare(b));
}
