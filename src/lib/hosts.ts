/**
 * Which of the two sites a request belongs to.
 *
 * Aangan is two products sharing one deployment: rooms on `aanganpg.com`, and
 * the mess system on `mess.aanganpg.com`. They have different customers and
 * different promises — the room site says "no brokerage, ever", which is not a
 * sentence that belongs above a page about mess fees.
 *
 * Kept pure, and kept out of `proxy.ts`: this decides, on every single request,
 * whether the public site is reachable at all. It is asserted in
 * `scripts/selfcheck.ts` rather than clicked through.
 */

export type HostRoute =
  | { kind: "pass" }
  | { kind: "rewrite"; to: string }
  | { kind: "redirect"; to: string };

const PASS: HostRoute = { kind: "pass" };

/** `mess.aanganpg.com`, and `mess.localhost` so the split is testable in dev. */
export function isMessHost(host: string | null | undefined): boolean {
  if (!host) return false;
  // Port stripped: `mess.localhost:3000` is the same host as `mess.localhost`.
  const name = host.split(":")[0].toLowerCase();
  return name === "mess.localhost" || name.startsWith("mess.");
}

/**
 * The paths that belong to the mess product.
 *
 * `/mess-home` and `/mess-admin` are internal: they are what the mess host's `/`
 * and `/admin` are rewritten to. They are listed here so the room host hands
 * them over rather than rendering them under a navbar full of hostel links.
 *
 * Matched by segment, so `/messages` is not `/mess`.
 */
function isMessPath(pathname: string): boolean {
  for (const base of ["/mess", "/my-mess", "/mess-home", "/mess-admin"]) {
    if (pathname === base || pathname.startsWith(`${base}/`)) return true;
  }
  return false;
}

/**
 * Requests that must never be sent to the other host.
 *
 * `/api/auth/*` is the important one: the two sites sign in separately, and a
 * sign-in that bounced to the other host would land its cookie on the wrong
 * domain. The dotted-filename test catches `/robots.txt`, `/sitemap.xml`,
 * `/manifest.webmanifest` and the icons, which should answer wherever they are
 * asked rather than redirecting a crawler across hosts.
 */
function isShared(pathname: string): boolean {
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) return true;
  const last = pathname.slice(pathname.lastIndexOf("/") + 1);
  return last.includes(".");
}

/**
 * Where this request should be served from.
 *
 * `urls` is passed in rather than read from the environment so this stays a
 * pure function. Both are origins with no trailing slash.
 */
export function routeForHost(
  host: string | null | undefined,
  pathname: string,
  urls: { main: string; mess: string },
): HostRoute {
  if (isShared(pathname)) return PASS;

  if (isMessHost(host)) {
    // The mess site's front door: a landing page for a stranger, and an instant
    // hand-off to their own dashboard for anyone signed in. `/mess-home` makes
    // that call.
    if (pathname === "/") return { kind: "rewrite", to: "/mess-home" };
    // The super admin console, at a clean address. The room site keeps its own
    // separate `/admin` — same word, different product, different host.
    if (pathname === "/admin") return { kind: "rewrite", to: "/mess-admin" };
    if (isMessPath(pathname)) return PASS;
    // A room page asked for on the mess host — an old bookmark, or a link in a
    // mail. Hand it to the site that owns it instead of 404ing.
    return { kind: "redirect", to: `${urls.main}${pathname}` };
  }

  // Sending a mess path away only happens on the real room site. A preview
  // deployment or a laptop has no mess host of its own, and bouncing there would
  // throw a developer at production — or at a domain that does not resolve.
  //
  // It also keeps local work possible at all: sessions are per host, and Google
  // will not sign anyone in to `mess.localhost`, so `localhost:3000/mess/...`
  // has to keep working.
  if (isMainHost(host, urls.main) && isMessPath(pathname)) {
    return { kind: "redirect", to: `${urls.mess}${pathname}` };
  }
  return PASS;
}

/** True only for the canonical room-site host, ignoring port. */
function isMainHost(host: string | null | undefined, mainUrl: string): boolean {
  if (!host) return false;
  return host.split(":")[0].toLowerCase() === new URL(mainUrl).hostname.toLowerCase();
}
