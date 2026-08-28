/**
 * Approximate a listing's location for people who are not signed in.
 *
 * The exact spot is behind the sign-in gate — `DirectionsButton` says "Sign in
 * for directions", and a public map with exact pins would hand that away for
 * free. So a signed-out visitor sees the neighbourhood, not the doorstep.
 *
 * Two properties this has to have, and both are easy to get wrong:
 *
 * 1. **Server-side only.** Offsetting in the browser is theatre: the real
 *    numbers would still be sitting in the page payload for anyone who looked.
 *    Callers must apply this before the coordinates cross to the client.
 * 2. **Deterministic.** The offset comes from the listing id, so a pin lands in
 *    the same wrong place every time. A random offset per render makes pins jump
 *    around on reload, which reads as a broken map rather than a private one.
 */

/** Metres per degree of latitude. Close enough to constant everywhere. */
const METRES_PER_DEG_LAT = 111_320;

/** The offset band. Far enough to hide the building, near enough to be useful. */
const MIN_OFFSET_M = 150;
const MAX_OFFSET_M = 350;

/**
 * FNV-1a. A hash, not a security primitive — it only needs to spread ids evenly
 * over the circle. `>>> 0` after each step keeps it in unsigned 32-bit range,
 * because JavaScript's bitwise operators produce signed integers.
 */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export type Coords = { lat: number; lng: number };

export function approximateLocation(id: string, lat: number, lng: number): Coords {
  const h = hash(id);

  // Two independent values out of one hash: the low 16 bits pick the direction,
  // the high 16 bits pick the distance. Using the same bits for both would put
  // every pin on a spiral.
  const angle = ((h & 0xffff) / 0x10000) * 2 * Math.PI;
  const distance = MIN_OFFSET_M + ((h >>> 16) / 0x10000) * (MAX_OFFSET_M - MIN_OFFSET_M);

  const dLat = (distance * Math.cos(angle)) / METRES_PER_DEG_LAT;
  // A degree of longitude shrinks towards the poles. At Kolhapur's 16.7°N that
  // is a 4% difference — small, but ignoring it skews every pin east-west and
  // costs nothing to get right.
  const dLng =
    (distance * Math.sin(angle)) / (METRES_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));

  return { lat: lat + dLat, lng: lng + dLng };
}

/** Metres between two points. Used by the self-check to prove the offset band. */
export function distanceMetres(a: Coords, b: Coords): number {
  const dLat = (a.lat - b.lat) * METRES_PER_DEG_LAT;
  const dLng =
    (a.lng - b.lng) * METRES_PER_DEG_LAT * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLng * dLng);
}
