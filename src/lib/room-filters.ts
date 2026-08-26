import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { GENDER_PREFERENCES, OCCUPANCY_TYPES } from "./property-options";

export const roomFiltersSchema = z.object({
  college: z.string().optional(),
  location: z.string().optional(),
  genderPreference: z.string().optional(),
  maxPrice: z.number().optional(),
  food: z.enum(["yes", "no"]).optional(),
  occupancy: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  rules: z.array(z.string()).optional(),
  sort: z.string().optional(),
});

export type RoomFilters = z.infer<typeof roomFiltersSchema>;

/** `?amenities=Wifi` and `?amenities=Wifi&amenities=Geyser` must both be arrays. */
const asArray = (v: unknown) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]);

/**
 * A URL's worth of filters, sanitised.
 *
 * Every field falls back to `undefined` instead of failing, because a bad query
 * string must render an unfiltered page — never a 500. `/search?maxPrice=abc`
 * used to reach `z.number()` as `NaN`, throw "Invalid filters", and hand Google
 * a 500 on the most-indexed page on the site.
 *
 * The caps are the second half of the job. These values become `unstable_cache`
 * keys, so an unbounded value space is an unbounded number of cache entries that
 * anyone can mint by editing the address bar.
 */
export function parseRoomFilters(
  params: Record<string, string | string[] | undefined>,
): RoomFilters {
  return {
    college: z.string().max(60).optional().catch(undefined).parse(params.college),
    location: z.string().max(60).optional().catch(undefined).parse(params.location),
    genderPreference: z.enum(GENDER_PREFERENCES).optional().catch(undefined).parse(params.genderPreference),
    maxPrice: z.coerce.number().int().positive().max(1_000_000).optional().catch(undefined).parse(params.maxPrice),
    food: z.enum(["yes", "no"]).optional().catch(undefined).parse(params.food),
    occupancy: z.enum(OCCUPANCY_TYPES).optional().catch(undefined).parse(params.occupancy),
    amenities: z.array(z.string().max(40)).max(20).optional().catch(undefined).parse(asArray(params.amenities)),
    rules: z.array(z.string().max(40)).max(20).optional().catch(undefined).parse(asArray(params.rules)),
    sort: z.enum(["price_asc"]).optional().catch(undefined).parse(params.sort),
  };
}

/**
 * The `where` clause behind every room listing on the site.
 *
 * Pure and synchronous, and deliberately NOT in a "use server" module: exporting
 * it from one turned a helper into a publicly callable RPC endpoint, and meant
 * the self-check had to await a network-shaped function to assert a plain object.
 */
export function buildRoomWhere(filters: RoomFilters): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = {
    deletedAt: null,
    closedAt: null,
  };

  if (filters.college) {
    where.college = { slug: filters.college };
  }

  if (filters.location) {
    where.location = filters.location;
  }

  if (filters.genderPreference) {
    // A co-ed room is a room a girl can take. Filtering on equality hides every
    // "Anyone" room and empties the results page.
    if (filters.genderPreference === "Female") {
      where.genderPreference = { in: ["Female", "Any"] };
    } else if (filters.genderPreference === "Male") {
      where.genderPreference = { in: ["Male", "Any"] };
    } else {
      where.genderPreference = filters.genderPreference;
    }
  }

  if (filters.maxPrice) {
    where.price = { lte: filters.maxPrice };
  }

  // null foodType means no mess at all — that IS the filter, which is why there
  // is no separate foodIncluded boolean.
  if (filters.food === "yes") {
    where.foodType = { not: null };
  } else if (filters.food === "no") {
    where.foodType = null;
  }

  if (filters.occupancy) {
    where.occupancyType = filters.occupancy;
  }

  // hasEvery, not hasSome: asking for WiFi AND hot water must not match a room
  // with only one of them.
  if (filters.amenities?.length) {
    where.amenities = { hasEvery: filters.amenities };
  }

  if (filters.rules?.length) {
    where.rules = { hasEvery: filters.rules };
  }

  return where;
}

export function buildRoomOrderBy(filters: RoomFilters): Prisma.PropertyOrderByWithRelationInput[] {
  if (filters.sort === "price_asc") {
    return [
      { price: "asc" },
      { verifiedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" }
    ];
  }
  return [
    { verifiedAt: { sort: "desc", nulls: "last" } },
    { createdAt: "desc" }
  ];
}
