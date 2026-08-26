/**
 * Who is an admin.
 *
 * One list, in `ADMIN_EMAILS`, and every guard in the app reads the `role` this
 * produces. Before this there were two different definitions in play — the navbar
 * tested `role`, while the page and action guards tested `phone === ADMIN_PHONE ||
 * role` — so an account could hold admin powers with no link to reach them.
 *
 * Adding an admin is one env var edit. Nothing is written to the database, so
 * there is no second copy of this fact to drift out of date.
 */

/**
 * Case-insensitive membership test against the comma-separated allowlist.
 *
 * `allowlist` is a parameter rather than a direct env read so this stays pure and
 * testable. An empty or missing list means nobody is an admin, which is the right
 * failure direction — a misconfigured env must not hand out the admin panel.
 */
export function isAdminEmail(
  email: string | null | undefined,
  allowlist: string | undefined = process.env.ADMIN_EMAILS,
): boolean {
  if (!email || !allowlist) return false;

  const target = email.trim().toLowerCase();
  if (!target) return false;

  return allowlist
    .split(',')
    .map(entry => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(target);
}

/**
 * The role a session gets, derived from nothing but the allowlist.
 *
 * Deliberately ignores any role already on the token or in the database. The
 * previous form was `isAdminEmail(email) ? "admin" : (token.role ?? "student")`,
 * which read back the value the *previous* request had written — so once a token
 * said "admin" it kept saying so for the life of the JWT, and removing an email
 * from ADMIN_EMAILS revoked nothing for up to 30 days.
 *
 * One input, one output, no history. Revoking is now an env edit that takes
 * effect on the next request, which is what adding one always did.
 */
export function resolveRole(email: string | null | undefined): "admin" | "student" {
  return isAdminEmail(email) ? "admin" : "student";
}

/**
 * The one account that owns the business, as opposed to the several that may
 * administer it.
 *
 * Analytics is scoped tighter than the admin panel: an operations helper on
 * ADMIN_EMAILS should be able to work the lead inbox without seeing user counts
 * and session totals. The email used to be written into two page files by hand,
 * which put a personal address in source control and meant handing the product
 * to someone else was a code change.
 *
 * Falls back to the first entry of ADMIN_EMAILS, so a deploy that has not set
 * OWNER_EMAIL still resolves to a real person rather than to nobody.
 */
export function isOwner(
  email: string | null | undefined,
  owner: string | undefined = process.env.OWNER_EMAIL,
  allowlist: string | undefined = process.env.ADMIN_EMAILS,
): boolean {
  const target = owner?.trim() || allowlist?.split(',')[0]?.trim();
  if (!email || !target) return false;

  return email.trim().toLowerCase() === target.toLowerCase();
}
