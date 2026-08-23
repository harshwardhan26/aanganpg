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
