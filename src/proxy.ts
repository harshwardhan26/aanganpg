import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { routeForHost } from "@/lib/hosts";
import { getBaseUrl, getMessUrl } from "@/lib/url";

/**
 * Two sites, one deployment.
 *
 * Rooms answer on `aanganpg.com`, the mess system on `mess.aanganpg.com`. This
 * is where a request is told which one it is, and it is also the second lock on
 * the admin area.
 *
 * The routing itself lives in `lib/hosts.ts` as a pure function with assertions
 * behind it — a mistake here takes down every page on both hosts at once.
 *
 * Named `proxy.ts`, not `middleware.ts`: Next 16 renamed the file convention and
 * builds under the old name warn on every run.
 */
const guard = withAuth({
  callbacks: {
    /**
     * The matcher below covers the whole site, so the default answer is yes —
     * the room site is public. Only two areas narrow it.
     *
     * `/admin` keeps the role test. `/mess` (staff) and `/my-mess` (a student's
     * own record) need a signed-in person but not an admin; *which* mess either
     * may open is a database question — membership for staff, an email on the
     * roll for a student — and this cannot read the database, so the layouts and
     * actions check it again.
     */
    authorized: ({ token, req }) => {
      const path = req.nextUrl.pathname;
      if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
        return token?.role === "admin";
      }
      // The landing page is the one mess screen a stranger may see.
      if (path === "/mess-home") return true;
      // The console checks for admin in its own layout and in every action.
      // Here it only has to be somebody.
      if (path.startsWith("/mess-admin")) return !!token;
      // The mess front door explains itself and offers a sign-in button.
      // Everything under it is somebody's own record.
      if (path === "/my-mess") return true;
      if (path.startsWith("/my-mess") || path.startsWith("/mess")) return !!token;
      return true;
    },
  },
  pages: {
    signIn: "/",
  },
});

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  const route = routeForHost(req.headers.get("host"), req.nextUrl.pathname, {
    main: getBaseUrl(),
    mess: getMessUrl(),
  });

  // Which site a request belongs to is settled before the session is consulted,
  // and deliberately so. `withAuth` returns early on its own sign-in page —
  // which is `/` — so host rules placed inside it never ran for the one path
  // that needed them most: the mess site's front door served the room homepage.
  //
  // Nothing is lost by deciding first. A request that leaves for the other host
  // meets that host's rules on arrival, and the rewrite target, `/my-mess`, is
  // public by design.
  if (route.kind === "rewrite") {
    const url = req.nextUrl.clone();
    url.pathname = route.to;
    return NextResponse.rewrite(url);
  }

  if (route.kind === "redirect") {
    // The query string travels with it: `?k=` on a scan link is the whole point
    // of the link.
    return NextResponse.redirect(`${route.to}${req.nextUrl.search}`);
  }

  return guard(req as NextRequestWithAuth, event);
}

export const config = {
  // Everything, because the host rules have to run everywhere. The exclusions
  // are static asset paths, served before this and with no host opinion.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
