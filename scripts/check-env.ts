/**
 * scripts/check-env.ts
 *
 * Reads .env via Node's built-in process.loadEnvFile(), prints each variable
 * from .env.example as set or missing, and exits non-zero if a build-critical
 * one is absent.
 *
 * Usage: npm run env
 * No new dependency — process.loadEnvFile() is enough.
 */

try { process.loadEnvFile(); } catch { /* .env may not exist in CI */ }

/**
 * Every variable from .env.example, grouped by criticality.
 * "graceful" means the feature degrades (no rate-limiting, no analytics, etc.)
 * but the build succeeds and the app starts.
 */
const ALL_VARS: { name: string; required: boolean; note: string }[] = [
  // ── Build-critical ──────────────────────────────────────────────
  { name: "DATABASE_URL",                          required: true,  note: "PostgreSQL connection string (must accept concurrent connections)" },
  { name: "NEXT_PUBLIC_SITE_URL",                  required: true,  note: "Canonical base URL for sitemap and OG tags" },

  // ── Auth (app starts but login won't work) ──────────────────────
  { name: "NEXTAUTH_URL",                          required: false, note: "Base URL for NextAuth callbacks" },
  { name: "GOOGLE_CLIENT_ID",                      required: true,  note: "Google OAuth client ID (student sign-in)" },
  { name: "GOOGLE_CLIENT_SECRET",                  required: true,  note: "Google OAuth client secret" },
  { name: "NEXTAUTH_SECRET",                       required: false, note: "Secret for signing NextAuth tokens" },


  // ── Cloudinary (images won't upload/transform) ──────────────────
  { name: "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",      required: false, note: "Cloudinary cloud name" },
  { name: "NEXT_PUBLIC_CLOUDINARY_PRESET",          required: false, note: "Cloudinary unsigned upload preset" },

  // ── Upstash (rate limiting disabled) ────────────────────────────
  { name: "UPSTASH_REDIS_REST_URL",                 required: false, note: "Upstash Redis REST URL for rate limiting" },
  { name: "UPSTASH_REDIS_REST_TOKEN",               required: false, note: "Upstash Redis REST token" },

  // ── PostHog (analytics disabled) ────────────────────────────────
  { name: "NEXT_PUBLIC_POSTHOG_KEY",                required: false, note: "PostHog project API key" },
  { name: "NEXT_PUBLIC_POSTHOG_HOST",               required: false, note: "PostHog host URL" },

  // ── Sentry (error tracking disabled) ────────────────────────────
  { name: "NEXT_PUBLIC_SENTRY_DSN",                 required: false, note: "Sentry DSN for error tracking" },

  // ── App config ──────────────────────────────────────────────────
  { name: "NEXT_PUBLIC_AANGAN_PHONE",               required: false, note: "Aangan's public contact number" },
  { name: "ADMIN_EMAILS",                           required: true,  note: "Comma-separated Google emails granted the admin panel" },
];

const missing: string[] = [];

console.log("\n  Environment Variable Check\n");
console.log(`  ${"Variable".padEnd(50)} Status`);
console.log("  " + "─".repeat(60));

for (const v of ALL_VARS) {
  const value = process.env[v.name];
  const isSet = value !== undefined && value !== "";
  const tag = v.required ? " (required)" : "";
  const icon = isSet ? "✓" : "✗";
  const color = isSet ? "\x1b[32m" : (v.required ? "\x1b[31m" : "\x1b[33m");
  const reset = "\x1b[0m";
  const label = (v.name + tag).padEnd(48);
  const status = isSet ? "set" : "missing";

  console.log(`  ${color}${icon}${reset} ${label} ${color}${status}${reset}`);

  if (!isSet && v.required) {
    missing.push(v.name);
  }
}

console.log();

if (missing.length > 0) {
  console.error(`\x1b[31m  ✗ Build-critical variables missing: ${missing.join(", ")}\x1b[0m\n`);
  process.exit(1);
} else {
  console.log("  \x1b[32m✓ All build-critical variables are set.\x1b[0m\n");
}
