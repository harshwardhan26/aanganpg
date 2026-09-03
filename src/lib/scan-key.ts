import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The token that only the printed poster carries.
 *
 * Without it, the "Mark my meal" button in a student's own app would let anyone
 * mark a meal from their bed, and the owner's headcount would stop describing
 * anything. Marking has to require having gone to the mess, and the poster on
 * the wall is the only thing standing there.
 *
 * Derived rather than stored: an HMAC of the mess id under the app's existing
 * signing secret is stable across deploys, unguessable without the secret, and
 * needs no column, no migration and nothing to rotate by hand. Rotating it for
 * every mess at once is a change of `NEXTAUTH_SECRET`, which already invalidates
 * every session — the same blast radius, so nothing new to reason about.
 *
 * It is not a strong control and is not meant to be: a student can photograph
 * the poster and send the link on. What stops that being worth doing is the
 * photo on the receipt, which the counter checks before handing over a plate.
 * This only closes the case that costs nothing to abuse.
 *
 * Server only — importing `node:crypto` from a client component breaks the
 * bundle, which is why this is not in `lib/mess.ts`.
 */
export function scanKey(messId: string, version = 1): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required to issue a scan key");

  const payload = version === 1 ? `mess-scan:${messId}` : `mess-scan:${messId}:v${version}`;
  return createHmac("sha256", secret).update(payload).digest("hex").slice(0, 16);
}

/** Constant-time compare, so a wrong key cannot be guessed one character at a time. */
export function scanKeyMatches(messId: string, given: string | undefined, version = 1): boolean {
  if (!given) return false;

  const expected = Buffer.from(scanKey(messId, version));
  const actual = Buffer.from(given);
  if (expected.length !== actual.length) return false;

  return timingSafeEqual(expected, actual);
}
