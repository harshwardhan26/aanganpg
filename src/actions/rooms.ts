"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { buildRoomWhere, buildRoomOrderBy, roomFiltersSchema, type RoomFilters } from "@/lib/room-filters";

export type { RoomFilters };

const slugSchema = z.string().min(1);

export async function getRooms(filters: RoomFilters = {}) {
  const parsed = roomFiltersSchema.safeParse(filters);
  if (!parsed.success) throw new Error("Invalid filters");
  return prisma.property.findMany({
    where: buildRoomWhere(parsed.data),
    take: 50,
    include: { college: true, images: true, reviews: { select: { rating: true } } },
    orderBy: buildRoomOrderBy(parsed.data),
  });
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

export async function getRoomsNearCollege(slug: string) {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return [];
  return getRooms({ college: parsed.data });
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
