Clean up the remaining minor findings from the production-readiness review. The
three blockers and the nine should-fix items are already done — this pass is only
the leftovers.

Read `AGENTS.md` first; it is binding. Read the relevant guide in
`node_modules/next/dist/docs/` before touching App Router, caching, or metadata
code — this Next version has breaking changes against most training data.

Keep the diff small. Do not refactor anything not on this list, and do not add a
dependency for anything under ~40 lines.

## 1. Add the missing selfcheck assertion for slug retention

`scripts/selfcheck.ts` covers `buildRoomWhere`, `canonicalPhone`, and
`cloudinaryUrl`, but nothing covers the slug rule fixed in `src/actions/admin.ts`
— an existing listing must keep its slug when its title is edited. That is the
one regression that stays invisible until links people already shared are dead,
which makes it the assertion most worth having.

`saveListing` hits the database, so do not try to test it end to end. Extract the
decision into a small pure function (something like
`resolveSlug(existingSlug, title, locality)`), use it from `saveListing`, and
assert both branches: an existing slug is returned unchanged even when the title
differs, and a new listing gets a freshly built slug. One assertion per branch,
`assert`-based, in the existing style. No test framework.

## 2. Restore the dropped comment in `src/actions/admin.ts`

When the `existing` lookup moved above the `fields` object, this comment was lost:

```
// Publishing is a visit record, not a boolean: a named person on a stated
// date, which is what the listing page shows. Re-publishing an already
// verified listing must not rewrite the original visit date.
```

Put it back, directly above the `verification` object it now explains. It
documents a rule that is otherwise invisible in the code, and it is exactly the
kind of thing someone deletes in six months.

## 3. Decide what `role` is for

`src/lib/auth.ts` now threads `role` from `authorize()` through the `jwt` and
`session` callbacks, and `types/next-auth.d.ts` declares it — but nothing reads
it. `requireAdmin()` in `src/actions/admin.ts` and the guard in
`src/app/admin/layout.tsx` both still compare `session.user.phone` to
`process.env.ADMIN_PHONE`.

Pick one and make it true:
- Keep `role` and add a one-line comment saying it is populated for future
  role-based checks and deliberately unused today, or
- Switch the two admin guards to read `role` instead of the env phone.

If you switch, note that `authorize()` assigns `role: "student"` to every new
user and nothing ever promotes anyone, so the admin would lock themselves out.
Either seed the admin's role or leave the phone check alone. Do not ship a
half-wired guard.

## 4. Add security headers

There is no CSP and no security headers at all. Add a `headers()` block to
`next.config.ts` covering at least `X-Content-Type-Options: nosniff`,
`Referrer-Policy`, `X-Frame-Options` (or `frame-ancestors`), and
`Strict-Transport-Security`.

A full `Content-Security-Policy` is a bigger job than it looks here: the site
loads Firebase Auth, an invisible reCAPTCHA iframe, PostHog, Sentry, Cloudinary
images, and Google Fonts, and a wrong `script-src` silently breaks login. If you
add CSP, start in `Content-Security-Policy-Report-Only`, verify the auth sheet
completes a real OTP round trip with a clean console, and leave a `ponytail:`
comment naming what still has to be verified before it is enforced. Shipping the
cheap headers now and CSP report-only is a better outcome than shipping a
blocking policy nobody tested.

## 5. Add CI

Every quality gate is manual today. Add one GitHub Actions workflow that runs on
push and pull request:

```
npx tsc --noEmit && npm run lint && npm run check && npm run build
```

`npm run build` needs `DATABASE_URL` and `NEXT_PUBLIC_SITE_URL` — `next.config.ts`
throws without the latter in production, and static generation queries the
database. Use repository secrets, or scope CI to the first three commands if a
database is not available to the runner. Say which you chose and why. One
workflow file, no matrix, no caching cleverness.

## 6. Review and commit the working tree

Roughly 18 modified and 8 untracked files are sitting uncommitted, including
`.env.example`, `docs/`, `instrumentation.ts`, `instrumentation-client.ts`, the
three new error pages, the logo assets, and `src/app/privacy/` and
`src/app/terms/`. None of it is deployed until it is committed.

Before committing: confirm `.env.example` contains only empty values and no real
secret, and confirm `.env` itself is still ignored. Then group the work into
coherent commits rather than one giant one — the Sentry wiring, the error pages,
and the security fixes are separate concerns. Show me the planned commits and
wait for my go-ahead before pushing anything.

## Done means

`npx tsc --noEmit && npm run lint && npm run check && npm run build` all clean,
with zero lint warnings. The new selfcheck assertions actually fail if you revert
the slug fix — verify that, do not assume it. If you touched headers, confirm the
auth sheet still completes a real OTP round trip with a clean console.

Report which items you completed, and which you did not and why.
