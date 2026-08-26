import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

type Window = Parameters<typeof Ratelimit.slidingWindow>[1];

/**
 * A sliding-window limiter, or null when Upstash is not configured.
 *
 * Each caller owns its own window because the right window differs per action —
 * five profile edits in ten minutes and five enquiries in one are not the same
 * shape of abuse.
 */
export function slidingLimiter(requests: number, window: Window) {
  return redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(requests, window), analytics: true })
    : null;
}

/**
 * Whether this request may proceed.
 *
 * The important branch is the last one. Previously every caller wrote
 * `if (ratelimit) { ... }`, so a missing Upstash config did not disable rate
 * limiting loudly — it disabled it silently, and the app went on serving writes
 * with no limiter at all. In development that is what you want. In production it
 * means one dropped environment variable removes every brake on the site at
 * once, with nothing in the logs to say so.
 *
 * So: open in development, closed in production. A limiter that cannot run is a
 * limiter that must refuse.
 */
export async function allowRequest(
  limiter: Ratelimit | null,
  key: string,
  // A parameter rather than a direct env read so the two limiter-less branches
  // can be asserted without mutating process.env. This is the single most
  // consequential decision in this file; it should not be the untested one.
  isProduction: boolean = process.env.NODE_ENV === "production",
): Promise<boolean> {
  if (limiter) {
    const { success } = await limiter.limit(key);
    return success;
  }

  if (isProduction) {
    console.error("[rate-limit] Upstash is not configured; refusing the request. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
    return false;
  }

  return true;
}
