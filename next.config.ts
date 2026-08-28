import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// The sitemap, canonicals and Open Graph tags are all absolute URLs built from
// this. A previous product shipped with them silently pointing at the wrong
// domain because the value defaulted instead of failing.
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SITE_URL) {
  throw new Error("NEXT_PUBLIC_SITE_URL is required in production");
}

const nextConfig: NextConfig = {
  // The Postgres driver must not be bundled. Turbopack's rewrite of `pg` broke
  // connection setup, and every database query failed with "Connection
  // terminated unexpectedly" while the identical code worked outside Next.
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "@prisma/client"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Seed/demo listings still point at Unsplash. Without this the detail
      // page throws "Invalid src prop" and returns a 500.
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async redirects() {
    return [
      // Cheap insurance for anything indexed under the old URL shapes.
      { source: "/property/:id", destination: "/pg/:id", permanent: true },
      { source: "/rooms/:slug", destination: "/pg/:slug", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          // Enforcing, not Report-Only. The report-only version had been running
          // long enough to say what the site actually loads; a policy that only
          // reports is a policy that stops nothing.
          //
          // 'unsafe-inline' in script-src is not removable yet: Next injects
          // inline bootstrap scripts, and nonce-ing them means going fully
          // dynamic and giving up the static rendering that /pg/[slug] depends
          // on. img-src carries the two hosts next.config allows for images plus
          // Google's avatar CDN, which next-auth puts in the session.
          //
          // ponytail: 'unsafe-eval' stays until something proves it unnecessary —
          // dropping it is a one-line change plus a full click-through.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              // *.posthog.com rather than the two exact hosts: posthog-js falls back to
              // app.posthog.com when NEXT_PUBLIC_POSTHOG_HOST is unset, and pins the
              // region host when it is. Naming only today's value means analytics dies
              // silently on the deploy where that variable goes missing.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.posthog.com",
              "connect-src 'self' https://*.googleapis.com https://*.sentry.io https://*.posthog.com https://api.cloudinary.com https://res.cloudinary.com",
              // tile.openstreetmap.org serves the map tiles on /search?view=map.
              // Leaflet loads them as plain <img>, so without this host the map
              // renders as a silent grey box — the CSP violation is the only
              // clue, and it never reaches the page.
              "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://lh3.googleusercontent.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "frame-src 'self'",
              "worker-src 'self' blob:",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "aangan-rooms",
  project: "aangan-rooms",
  widenClientFileUpload: true,
  // Upload source maps for readable stack traces, then delete them from the
  // deployed bundle so they are not publicly served.
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
