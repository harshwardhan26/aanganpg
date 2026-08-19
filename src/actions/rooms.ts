"use server";

import prisma from "@/lib/prisma";
import { buildRoomWhere, buildRoomOrderBy, type RoomFilters } from "@/lib/room-filters";

export type { RoomFilters };

export async function getRooms(filters: RoomFilters = {}) {
  return prisma.property.findMany({
    where: buildRoomWhere(filters),
    take: 50,
    include: { college: true, images: true },
    orderBy: buildRoomOrderBy(filters),
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
  return prisma.property.findUnique({
    where: { slug, deletedAt: null },
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
  return prisma.college.findUnique({ where: { slug } });
}

export async function getRoomsNearCollege(slug: string) {
  return getRooms({ college: slug });
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
