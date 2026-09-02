import { withAuth } from "next-auth/middleware";

/**
 * A second lock on the admin area.
 *
 * `admin/layout.tsx` and `requireAdmin()` in the actions both already check the
 * role, and both are correct. What they are not is automatic: a new page under
 * `/admin` or a new route under `/api/admin` is unprotected until someone
 * remembers to add the guard, and forgetting is silent.
 *
 * This runs before either of them and needs nobody to remember anything. The
 * `role` claim it reads is the one `resolveRole` recomputes from ADMIN_EMAILS on
 * every request, so revocation reaches here too.
 *
 * Named `proxy.ts`, not `middleware.ts`: Next 16 renamed the file convention and
 * builds under the old name warn on every run. The export is unchanged —
 * `withAuth` still returns the same handler, this file just answers to the name
 * the framework now looks for.
 */
export default withAuth({
  callbacks: {
    /**
     * `/mess` (staff) and `/my-mess` (a student's own record) need a signed-in
     * person, not an admin. *Which* mess either may open is a database question
     * — membership for staff, an email on the roll for a student — and this
     * cannot read the database, so the layouts and actions check it again. All
     * this does is keep signed-out traffic out entirely.
     *
     * `/admin` keeps the stricter test it always had.
     */
    authorized: ({ token, req }) => {
      const path = req.nextUrl.pathname;
      if (path.startsWith("/my-mess") || path.startsWith("/mess")) return !!token;
      return token?.role === "admin";
    },
  },
  pages: {
    signIn: "/",
  },
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/mess/:path*", "/my-mess/:path+"],
};
