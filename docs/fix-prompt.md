Fix the production-readiness findings in this repo. Work through them in the order
below — blockers first, then the should-fix items, then the minor cleanups. Read
`AGENTS.md` first; it is binding. Read the relevant guide in
`node_modules/next/dist/docs/` before touching App Router, caching, or metadata
code — this Next version has breaking changes against most training data.

Do not refactor anything that is not on this list. Do not add a dependency for
anything under ~40 lines.

## Blockers

1. **`processEnquiry` is a public RPC with an attacker-controlled `ip`.**
   `src/actions/enquiries.ts:21`. This file is `"use server"`, so every exported
   async function is a public HTTP endpoint, and `ip` is a caller-supplied
   parameter. An attacker passes a fresh `ip` on each call, the sliding-window
   rate limit never trips, and they write unlimited `Lead` rows. Remove the
   `export` from `processEnquiry` so only `recordEnquiry` — which derives the IP
   from request headers itself — stays public. Verify no other module imports it.

2. **Sentry never initializes; error tracking is dead.**
   `@sentry/nextjs@10` no longer auto-loads `sentry.client.config.ts` or
   `sentry.server.config.ts`. `grep -rli sentry src/` returns nothing today. Wire
   it the way version 10 requires: an `instrumentation.ts` at the project root
   exporting `register()` (importing the server and edge configs by runtime) and
   `onRequestError`, plus an `instrumentation-client.ts`. Check the installed
   package's own docs for the exact contract rather than assuming. Delete any of
   the three `sentry.*.config.ts` files that end up unused. Also lower
   `tracesSampleRate` from `1` to something sane for production (0.1 or a
   `tracesSampler`).

3. **No error boundaries and no 404 page.**
   There is no `error.tsx`, `not-found.tsx`, or `global-error.tsx` anywhere under
   `src/app/`. A single database timeout renders Next's raw error page, and
   `notFound()` in `src/app/pg/[slug]/page.tsx:55` falls through to the default
   stub. Add a root `error.tsx`, a root `not-found.tsx`, and a `global-error.tsx`
   (the last one is also what Sentry needs to capture client crashes). Style them
   with the existing tokens and components — they are real pages on a live site,
   not placeholders.

## Should fix

4. **Slug regenerates on every edit and breaks live URLs.**
   `src/actions/admin.ts:186` calls `uniqueSlug(data.title, ...)` unconditionally,
   so an admin fixing a typo in a title silently 404s every link already forwarded
   on WhatsApp. This contradicts the stated intent in `getRoomBySlug`
   (`src/actions/rooms.ts`), which deliberately keeps closed listings resolving
   for exactly that reason. Keep the existing slug on update. Only mint a new one
   when there is no existing row.

5. **`revalidatePath` misses two surfaces.** `src/actions/admin.ts:216-219`
   revalidates `/`, `/search`, `/pg/[slug]`, and `/admin/listings`, but not:
   - `/kolhapur/[collegeSlug]` — 15 prerendered SSG pages, stale until redeploy
   - `/sitemap.xml` — static, so new listings never reach Google until redeploy
   Revalidate both on save. For the college pages, revalidate the affected
   college's path (and the old one too, if the listing's `collegeId` changed).

6. **The OTP rate limit is advisory only.** `src/app/api/auth/otp/init/route.ts`
   returns `{ success: true }` and sends nothing; the client then calls Firebase's
   `signInWithPhoneNumber` separately (`src/components/auth/AuthSheet.tsx`).
   Nothing forces the first call, so skipping it sends unlimited SMS — a direct
   billing loss via SMS pumping. Firebase's own quota and the invisible reCAPTCHA
   are the only real defense right now. Close the gap: prefer enabling Firebase
   App Check, and if that is out of scope for this pass, leave a `ponytail:`
   comment naming the exposure and the upgrade path rather than pretending the
   endpoint protects anything.

7. **Contrast violations against the build rule in `AGENTS.md`.** `#f45151` is
   3.42:1 on white — below the 4.5:1 floor for body text, and it is not large
   text at 15px semibold. `--primary-strong` `#cc4040` (4.80:1) already exists in
   `src/app/globals.css:43-45` and is what filled buttons are supposed to use.
   Replace the hardcoded hex with the existing tokens at:
   - `src/components/auth/AuthSheet.tsx:158` and `:208` — `bg-[#f45151] text-white`
   - `src/components/auth/AuthSheet.tsx:153` and `:203` — error text
   - `src/components/auth/AuthSheet.tsx:138`, `:139`, `:177`, `:179`, `:191`, `:197`
   - `src/app/terms/page.tsx:38` and `src/app/privacy/page.tsx:38` — links
   Use the token utilities, not new hex values, and not new CSS.

8. **No `take` on any query.** `src/actions/rooms.ts:9` — `getRooms` is an
   unbounded `findMany` with `include: { college, images }`. The homepage fetches
   every property in the database to render six cards. Add a sane cap. Full
   pagination is not required for this pass; a limit is.

9. **`.env.example` is not committed.** `.gitignore` has `.env*`, which swallows
   it, so `git ls-files | grep env` returns nothing and `npm run env` validates
   against a template no new machine has. Add a `!.env.example` negation and
   commit the file. Confirm no real secret is in it first.

## Minor

- `PrismaAdapter` is inert: `src/lib/auth.ts` sets `session.strategy: "jwt"` with
  a credentials provider, so `Account`, `Session`, and `VerificationToken` are
  never written. Remove the adapter, or state in a comment why it stays.
- `authorize()` returns `role`, but the `jwt` callback drops it and the admin
  check uses phone only. Either thread `role` through to the session or drop it.
- The `OtpToken` model in `prisma/schema.prisma` has zero references in `src/`.
  Remove it (with a migration).
- `src/actions/enquiries.ts:95` uses the whole `x-forwarded-for` header as the
  rate-limit key; take the first entry.
- The Cloudinary upload preset is unsigned and public (`src/lib/upload.ts`).
  Code change is not required, but note in `docs/DEPLOY.md` that the dashboard
  preset must cap file size, formats, and rate.
- Unused `Button` import at `src/components/auth/AuthSheet.tsx:5` — the one lint
  warning in the repo.

## Done means

`npx tsc --noEmit && npm run lint && npm run check && npm run build` all clean,
with zero lint warnings. Every non-trivial pure function you touch or add leaves
one assertion behind in `scripts/selfcheck.ts` — in particular the slug-retention
rule from item 4. Render and eyeball the auth sheet, the new error and 404 pages,
and a listing page at 390px and 1440px.

Report at the end which items you completed, and which you did not and why.
