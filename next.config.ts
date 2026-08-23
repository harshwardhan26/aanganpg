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
          // ponytail: A full Content-Security-Policy is a bigger job than it looks. The site loads
          // PostHog, Sentry, Cloudinary images, and Google Fonts. Sign-in is a top-level redirect to
          // accounts.google.com, which CSP does not govern, so no directive is needed for it.
          // Verify a real Google sign-in round trip with a clean console before enforcing this.
          {
            key: "Content-Security-Policy-Report-Only",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://us.i.posthog.com; connect-src 'self' https://*.googleapis.com https://*.sentry.io https://us.i.posthog.com https://res.cloudinary.com; img-src 'self' data: https://res.cloudinary.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-src 'self';",
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
