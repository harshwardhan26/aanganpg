export function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

/**
 * The mess site's origin — `https://mess.aanganpg.com`.
 *
 * Printed on the QR poster and used for the cross-host redirects, so it has to
 * be right in production; `MESS_URL` is the answer there. No `NEXT_PUBLIC_`
 * prefix: only the proxy and the poster page read this, both on the server, and
 * a prefixed variable is baked into the browser bundle for no reason.
 * fallback derives `mess.` + whatever host the room site is on, which is what
 * makes `mess.localhost:3000` work in development without any configuration.
 */
export function getMessUrl() {
  if (process.env.MESS_URL) {
    return process.env.MESS_URL;
  }
  const base = new URL(getBaseUrl());
  // `www.` is stripped first: the site's canonical host is www.aanganpg.com, and
  // prefixing that gives mess.www.aanganpg.com, which is nobody's domain.
  base.hostname = `mess.${base.hostname.replace(/^www\./, "")}`;
  // `new URL().origin` drops the trailing slash `toString()` would add.
  return base.origin;
}
