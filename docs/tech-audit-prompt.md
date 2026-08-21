# Full technical audit — prompt

Paste this into a fresh session. It audits everything: config, database,
auth, server actions, routing, caching, external services, frontend, and the
deployed site.

---

## Rules for whoever runs this

**Verify, do not assume.** Every finding cites `file:line`, a command you ran, or
an HTTP response you got. "This looks wrong" is not a finding. If you could not
verify something, say so explicitly instead of guessing.

**Run things.** Query the database. `curl` the live site. Execute the scripts.
Reading code and reasoning about it catches maybe half of what is actually
broken — the September audit found a stale WebP variant and a Tailwind class
generating no CSS, and neither was visible in the source.

**Read the Next.js docs first.** This is Next 16.3.1 and it has breaking changes
against most training data. `node_modules/next/dist/docs/` has the guides. Do
not write or judge App Router, routing, caching or metadata code from memory.

**Read `AGENTS.md`.** It is binding: mobile-first, Tailwind and shadcn only, no
bare element selectors setting layout, `overflow-x: clip` never `hidden`,
explicit `object-fit` on every `fill` image, contrast as a build rule, real
array columns with `hasEvery`, E.164 phones through `canonicalPhone()`, never
treat 0 as absent, no new dependency under ~40 lines.

**Do not fix anything.** Report only. Fixes come after triage, in a separate
pass, so nothing gets changed while the picture is still incomplete.

**Do not write to the production database.** Read-only queries only. Ask before
any write.

---

## Stack, so you know what you are looking at

- Next.js 16.3.1 App Router, React 19.2.8, Turbopack. `params` and
  `searchParams` are Promises.
- Prisma 7.9.1 with `@prisma/adapter-pg`. `serverExternalPackages: ["pg", ...]`
  in `next.config.ts`.
- NextAuth 4, Credentials provider wrapping Firebase phone OTP, JWT sessions.
  `session.user.phone` is set in `src/lib/auth.ts:70`.
- Upstash Redis + `@upstash/ratelimit`, sliding window.
- Sentry 10 via `instrumentation.ts` and `instrumentation-client.ts` — not the
  legacy `sentry.*.config.ts` files.
- Tailwind v4 with `@theme inline`, shadcn, `@base-ui/react` Button.
- Cloudinary, unsigned browser-direct upload from `src/lib/upload.ts`.
- PostHog analytics.
- Deployed on Vercel at `https://aanganpg.vercel.app`.

---

## 1. Environment and configuration

- Every `process.env` reference in `src/`. For each: is it in `.env.example`, is
  it set locally, is it set in production? Cross-check against the live site.
- `NEXT_PUBLIC_*` variables are baked into the client bundle at build time.
  Confirm no secret is exposed this way. Grep the built `.next/static` output for
  any value that should be server-only.
- Production build-time guards: `getAanganPhone()` and `getGrievanceOfficer()` in
  `src/lib/contact.ts` throw when their variables are missing in production.
  Confirm the pattern is applied to every value that must not fall back to a
  placeholder, and that none of them throws during a legitimate build.
- `.env` must be git-ignored. Confirm no credential has ever been committed —
  check history, not just the working tree.

## 2. Database and Prisma

- Connect and report: table list, row counts per table, and every row in
  `Property` with its slug, `ownerPhone`, `vacantBeds`, `closedAt`, `deletedAt`.
- **Is the local database the same one as production?** Establish this before any
  query and say so in the report.
- Test data in production: any row that is a fixture, sample, or leftover from
  development. Name each one.
- Migration state: does `prisma/migrations` match the schema? Any drift, any
  migration applied to one environment and not the other?
- Every `String[]` column is filtered with `hasEvery`, never a comma-joined
  string. Check `amenities` and `rules` at every call site.
- Indexes: for each `where` clause in `src/actions/` and `src/lib/room-filters.ts`,
  is there an index that serves it? Report queries doing a sequential scan.
- N+1 patterns: any `findMany` followed by a per-row query. Check the admin lead
  counts and the listing pages specifically.
- Nullable handling: any place a `0` value is treated as absent. This has already
  bitten twice — check every numeric field, especially `deposit`, `walkMinutes`,
  `vacantBeds`, `price`, `lat`, `lng`.
- Orphan risk: `onDelete` behaviour on every relation. What happens to `Lead`
  rows when a `Property` is deleted?
- Connection pooling: confirm the adapter config is right for serverless — a new
  pool per invocation exhausts Postgres connections under load.

## 3. Authentication

- Trace the full sign-in path end to end: Firebase OTP → `verify-firebase-token`
  route → Credentials provider → JWT → session.
- Is the Firebase ID token verified server-side, with signature and expiry
  checked? A client-supplied token that is merely decoded is a full auth bypass.
- Session contents: does anything sensitive end up in the JWT, which is readable
  by the client?
- `requireAdmin()` in `src/actions/admin.ts` compares `session.user.phone` to
  `ADMIN_PHONE`. Confirm it is called at the top of **every** exported action in
  that file, not just some. Confirm the same check guards `/admin/*` pages.
- Session expiry and refresh. What happens when a token expires mid-session?
- Rate limiting on the OTP request path. Absent, someone can burn your SMS quota
  and your Firebase bill in an afternoon.

## 4. Server Actions and API routes

**Every exported async function in a `"use server"` file is a public HTTP
endpoint.** It can be called directly by anyone, with any arguments, regardless
of what the UI does.

- Enumerate every exported function in every `"use server"` file. For each:
  who may call it, what validates the input, what happens with hostile input.
- Any action taking a caller-supplied value that should come from the server
  instead — an IP, a user id, a phone number, a price. `processEnquiry` in
  `src/actions/enquiries.ts` was previously exported with a caller-supplied `ip`,
  which bypassed the rate limit; check nothing similar has returned.
- Zod validation on every input boundary. Report any action trusting its
  arguments.
- `src/app/api/**` routes: auth, input validation, and error responses that do
  not leak internals.
- Rate limiting: which endpoints have it, which need it. Enquiries has it;
  auth, upload and search may not.
- Error handling: does any catch block swallow an error silently, and does any
  error response return a stack trace or a database message to the client?

## 5. Routing and rendering

- Every route in `src/app`. For each: static, SSG, or dynamic, and is that the
  right choice?
- `params` and `searchParams` are Promises in this version. Find every place they
  are read without `await`. This has already caused one production crash.
- `generateStaticParams` — what does it cover, and what happens to a listing
  created after the build?
- `generateMetadata` on every page: title, description, canonical, OG image.
  Report anything missing, duplicated across pages, or containing a placeholder.
- `metadataBase` and `NEXT_PUBLIC_SITE_URL`. **Check the deployed site, not the
  code** — `curl` the live canonical tags and sitemap and confirm they are
  absolute production URLs.
- `not-found.tsx`, `error.tsx`, `global-error.tsx`: do they render, are they
  styled, do they leak anything? `global-error.tsx` cannot use app CSS — confirm
  what it does instead.
- Redirects, trailing slashes, and case sensitivity: is there exactly one URL per
  page, or several that all return 200?
- `robots.ts` and `sitemap.ts`: are closed, deleted, and full listings excluded?

## 6. Caching and revalidation

This is where the highest-impact bugs live in this codebase.

- Every `revalidatePath` and `revalidateTag` call. For each mutation, list every
  public surface showing that data, and confirm all of them are revalidated.
- Specifically: `markFull`, `markClosed`, `softDelete` and `saveListing` in
  `src/actions/admin.ts`. A closed room must disappear from `/`, `/search`,
  `/kolhapur/*` and `/sitemap.xml`, not just `/admin/listings`.
- ISR intervals: what is stale for how long, and is that acceptable for vacancy
  data that changes daily?
- `fetch` cache semantics under Next 16 — read the docs, do not assume the
  defaults you remember.
- Any user-specific data rendered in a statically cached page. That is a data
  leak between users.

## 7. External services

For each of Firebase, Cloudinary, Upstash, Sentry, PostHog:

- What happens when it is down or misconfigured? Does the site degrade or crash?
  `src/lib/upload.ts` and `src/actions/enquiries.ts` both guard for absent config
  — confirm every integration does.
- Is any secret reachable from the client?
- Cloudinary uses an **unsigned** upload preset. Confirm the preset restricts
  file size, format and folder. Unsigned means anyone who reads your JS can
  upload to your account.
- Timeouts and retries on every outbound call. An un-timed-out fetch in a server
  action hangs the request.
- Cost exposure: which service bills per call, and what stops a malicious caller
  running the bill up?

## 8. Frontend

- Client/server boundary: any `"use client"` component that did not need to be
  one, and any server-only import leaking into a client component.
- Hydration mismatches. Check the console on the **production** build, not dev —
  dev shows warnings that do not reproduce in production.
- `next/image`: every `fill` usage has an explicit `object-fit`; every image has
  `sizes`; `priority` only on above-the-fold images.
- Tailwind v4 arbitrary values that generate no CSS. `bg-[image:...]` silently
  produced nothing and removed a contrast scrim from the hero. Check the
  **computed styles in a browser**, not the class strings.
- Contrast, against actual rendered backgrounds: body ≥ 4.5:1, large ≥ 3:1.
- Touch targets ≥ 44px at 390px width.
- Horizontal overflow at 390px on every page.
- Fixed and sticky elements: does anything cover content at maximum scroll? The
  listing page has a fixed mobile contact bar with content behind it.
- Forms: validation, error display, disabled states during submit, and what
  happens on a slow or failed network.
- `localStorage` usage: does it survive a schema change, and does stale data ever
  break the form?

## 9. Observability

- Sentry: is it actually receiving events from production? Send a test error and
  confirm, do not just check that the config exists.
- Source maps uploaded, or are production stack traces unreadable?
- `SENTRY_AUTH_TOKEN` present in the build environment?
- PostHog: are events firing, and does any event carry a phone number or other
  personal data into a third-party analytics service?
- Server-side logging: is there any way to see what happened during a failed
  request in production?

## 10. Build, CI and deployment

- `npx tsc --noEmit && npm run lint && npm run check && npm run build` — run all
  four, report exact output.
- Does CI run all four, or does it skip the build?
- Bundle size, and the largest client-side dependencies.
- Any dependency that could have been a few lines of code, per `AGENTS.md`.
- `npm audit` — report only what is actually reachable from this code, not the
  raw count.
- Vercel configuration: environment variables per environment, build command,
  Node version, function regions relative to the database region.
- Is the deployed commit the same as `origin/main`?

## 11. The live site

Do this against `https://aanganpg.vercel.app` (or the custom domain if it is
live by then), not localhost:

- Every route: status code, and time to first byte.
- Canonicals, OG tags and sitemap contents — absolute production URLs, or
  localhost?
- A real sign-in with a real phone number. Does OTP arrive? Does the session
  persist?
- A listing page: does Call reach the owner's number and WhatsApp reach Aangan?
  Is the prefill message complete and correctly encoded?
- Security headers: what is set, what is missing, is the CSP still
  report-only?
- Anything indexable that should not be — admin routes, test fixtures, closed
  listings.

---

## Already known — confirm, do not re-report as new

These were found in earlier audits. State whether each is still present, fixed,
or changed. Do not spend the report re-explaining them.

1. `NEXT_PUBLIC_SITE_URL` unset in production — canonicals and sitemap emit
   `http://localhost:3000`.
2. Test fixtures live in the production database and rendering on the public
   homepage: `verified-fully-loaded-pg`, `very-long-title`, `zero-beds-vacant`,
   `closed-pg`.
3. `markFull` / `markClosed` / `softDelete` revalidate only `/admin/listings`.
4. The fixed mobile contact bar on `/pg/[slug]` covers the footer at maximum
   scroll; `Footer` sits outside `<main>` in `layout.tsx`.
5. `/privacy` has not been rewritten to DPDP standard.
6. `Lead` is missing `stage`, `followupDate`, `lastMessageAt`, `rawMessage`.
7. `src/lib/upload.ts:62` — unused `e` in the retry catch block.
8. A listing with `vacantBeds: 0` renders publicly with working contact buttons.

---

## Output format

Group findings by severity, most severe first.

For each: **what it is**, **file:line or the command and its output**, **what
breaks in real use**, **the fix in one sentence**, and **how long it takes**.

Then rate, 1–10 with one line of justification each: database integrity, auth and
authorisation, server action security, routing and rendering, caching
correctness, external service resilience, frontend quality, mobile experience,
observability, build health, and overall production readiness.

End with the three things to fix first, and why those three.

Say plainly what you could not verify and why. An audit with honest gaps is
worth more than one that guessed.
