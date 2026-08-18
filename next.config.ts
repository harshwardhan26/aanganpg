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
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  async redirects() {
    return [
      // Cheap insurance for anything indexed under the old URL shapes.
      { source: "/property/:id", destination: "/pg/:id", permanent: true },
      { source: "/rooms/:slug", destination: "/pg/:slug", permanent: true },
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
