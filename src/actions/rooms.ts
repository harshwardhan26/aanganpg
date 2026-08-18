"use server";

import prisma from "@/lib/prisma";
import { buildRoomWhere, type RoomFilters } from "@/lib/room-filters";

export type { RoomFilters };

export async function getRooms(filters: RoomFilters = {}) {
  return prisma.property.findMany({
    where: buildRoomWhere(filters),
    include: { college: true, images: true },
    orderBy: [{ verifiedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
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

export async function getColleges() {
  return prisma.college.findMany({ orderBy: { name: "asc" } });
}

export async function getCollegeBySlug(slug: string) {
  return prisma.college.findUnique({ where: { slug } });
}

export async function getRoomsNearCollege(slug: string) {
  return getRooms({ college: slug });
}
