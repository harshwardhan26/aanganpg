/**
 * Reading the caller's identity off request headers.
 *
 * Pure and dependency-free so `scripts/selfcheck.ts` can assert it without a
 * server: the precedence rules here are the kind of thing that looks obviously
 * right and is obviously wrong.
 */

type HeaderBag = Record<string, string | null | undefined>;

/**
 * The client's IP, as far as it can be trusted.
 *
 * `x-forwarded-for` is a list that grows left to right, and the client writes
 * the FIRST entry — so `split(',')[0]`, the spelling everyone reaches for, hands
 * a rate-limit key straight to the caller: send a new value each request, get a
 * fresh bucket each request, and the limit is decoration. The rightmost entry is
 * the hop our own proxy appended, which is the only one it makes sense to trust.
 *
 * Vercel sets `x-real-ip` itself and overwrites anything the caller sent, so it
 * is preferred outright when present.
 *
 * Returns `"unknown"` rather than a per-caller value when there is nothing
 * usable: everyone then shares one bucket, which is restrictive rather than
 * permissive, and that is the right direction for this to fail.
 */
export function trustedIp(headers: HeaderBag): string {
  const realIp = headers["x-real-ip"]?.trim();
  if (realIp) return realIp;

  const hops = headers["x-forwarded-for"]
    ?.split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);

  if (hops?.length) return hops[hops.length - 1];

  return "unknown";
}
