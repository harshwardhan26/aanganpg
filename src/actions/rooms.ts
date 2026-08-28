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

/**
 * Every matching room that has a pin on it, for the map view.
 *
 * Not `getRooms`: that is paginated at 24 (a map showing page 1 of its own
 * filter results is a lie) and it `include`s every image row of every listing,
 * which is a lot of payload to render a dot. This selects only what a pin and
 * its popup draw.
 *
 * `lat`/`lng` are exact here. Blurring for signed-out visitors happens in the
 * page, via `approximateLocation` — this function has no session to read.
 *
 * The 200 cap is a payload guard, not a page: every pin ships to the browser at
 * once, so this is the point at which a map would need clustering and a
 * viewport query instead. Kolhapur is nowhere near it.
 */
export async function getRoomPins(filters: RoomFilters = {}) {
  const parsed = roomFiltersSchema.safeParse(filters);
  if (!parsed.success) throw new Error("Invalid filters");

  return prisma.property.findMany({
    where: {
      ...buildRoomWhere(parsed.data),
      lat: { not: null },
      lng: { not: null },
    },
    take: 200,
    select: {
      id: true,
      slug: true,
      title: true,
      price: true,
      displayPrice: true,
      imageUrl: true,
      walkMinutes: true,
      lat: true,
      lng: true,
      college: { select: { shortName: true, name: true } },
    },
    orderBy: buildRoomOrderBy(parsed.data),
  });
}

/** How many matching rooms have no pin, so the map can own up to what it hides. */
export async function countRoomsWithoutPins(filters: RoomFilters = {}) {
  const parsed = roomFiltersSchema.safeParse(filters);
  if (!parsed.success) throw new Error("Invalid filters");

  return prisma.property.count({
    where: {
      ...buildRoomWhere(parsed.data),
      OR: [{ lat: null }, { lng: null }],
    },
  });
}
