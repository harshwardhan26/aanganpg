import { unstable_cache } from "next/cache";
import { getRooms, getColleges, getRoomPins, countRoomsWithoutPins, type RoomFilters } from "@/actions/rooms";

/**
 * Cached reads for `/search`.
 *
 * The page takes `searchParams`, so it can never be prerendered the way
 * `/pg/[slug]` is. Caching the queries instead gets the same win: an uncached
 * search cost two round trips to a Postgres on another continent and measured
 * 8.5 req/s with a 2.1s p50 under 20 concurrent students.
 *
 * Arguments are part of the cache key, so each filter combination caches
 * separately. Anything that changes a listing calls `revalidateTag(ROOMS_TAG)`,
 * so the window below is a ceiling, not a delay on edits.
 */
export const ROOMS_TAG = "rooms";

export const getCachedRooms = unstable_cache(
  async (filters: RoomFilters, page = 1) => getRooms(filters, page),
  ["search-rooms"],
  { tags: [ROOMS_TAG], revalidate: 300 },
);

// Colleges are a fixed list that changes when we add a campus, not when a room
// is listed — but it shares the tag so one invalidation covers both.
export const getCachedColleges = unstable_cache(
  async () => getColleges(),
  ["search-colleges"],
  { tags: [ROOMS_TAG], revalidate: 3600 },
);

/**
 * Map pins, sharing the `rooms` tag so publishing or closing a listing moves
 * its pin at the same moment it moves its card.
 */
export const getCachedRoomPins = unstable_cache(
  async (filters: RoomFilters) => getRoomPins(filters),
  ["search-room-pins"],
  { tags: [ROOMS_TAG], revalidate: 300 },
);

export const getCachedRoomsWithoutPins = unstable_cache(
  async (filters: RoomFilters) => countRoomsWithoutPins(filters),
  ["search-rooms-no-pins"],
  { tags: [ROOMS_TAG], revalidate: 300 },
);
