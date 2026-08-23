import { Redis } from "@upstash/redis";

/**
 * The shared Upstash client, or null when Upstash is not configured.
 *
 * Guarded rather than eager: dev and the build must still run without Upstash
 * credentials. Callers skip rate limiting when this is null — skipped, never
 * faked, so a missing limiter is visible in behaviour rather than silently
 * pretending to enforce something.
 *
 * Each caller owns its own window; there is no shared Ratelimit here because the
 * right window differs per action.
 */
export const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;
