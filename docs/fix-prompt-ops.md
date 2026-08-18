Make the admin tooling usable for the way Aangan actually works: a person
standing inside a PG in Kolhapur, on a phone, on mobile data, entering a listing
they just photographed.

Everything below is about `/admin` and the lead pipeline. It does not touch the
public site — that is `docs/fix-prompt-mobile.md`.

Read `AGENTS.md` first; it is binding. Read the relevant guide in
`node_modules/next/dist/docs/` before touching App Router, caching, or metadata
code — this Next version has breaking changes against most training data.

**The database is empty** (0 properties, 15 colleges) and `npm run seed` only
upserts colleges. To exercise the admin form you will need to create a listing
through the form itself, which is the point — do that, then delete the row when
you are done. Do not leave test listings behind.

Do not weaken `pgPublishIssues` in `src/lib/property-options.ts`. Requiring six
photos, a tagged bathroom shot, a thali when a mess is claimed, and a warden plus
gate time on girls' listings is the product, not friction to be optimised away.
Every item below makes those requirements easier to satisfy, never optional.

---

## 1. The photo tag control is unreachable on a phone

`src/app/admin/listings/ListingForm.tsx:280` — the tag `<select>` and the Remove
button sit inside an overlay styled `opacity-0 group-hover:opacity-100`.

Touch devices have no hover. So on a phone you can upload photos but you cannot
tag one as `bathroom` — and `pgPublishIssues` refuses to publish without a
bathroom tag. **The listing can never be completed from a phone.** This is the
single blocker that decides whether listings can be entered on site or only later
at a desk.

Make the tag control always visible on touch. A `@media (hover: hover)` gate on
the overlay behaviour is the honest fix — keep the hover reveal for mouse, show
the controls permanently where hover does not exist. Do not rely on a `sm:`
breakpoint as a proxy for "has a mouse"; a tablet gets both wrong.

While you are there: the tag `<select>` and the Remove button are small even on a
laptop. Give them real touch targets, at least 44px, on the touch path.

## 2. Photos upload one at a time

`ListingForm.tsx:54-70` reads only `e.target.files[0]`, and the input at line 304
has no `multiple` attribute. Publishing needs **six photos minimum**, so that is
six separate picks and six sequential round trips, on mobile data, standing in a
stairwell. It is the slowest step in the whole operation.

Add `multiple` and upload the selected files together. Show per-file progress or
at least a count, because a silent six-file upload on 4G looks like a hang. Keep
the existing per-file error handling from `src/lib/upload.ts` — one failed file
must not discard the ones that succeeded.

## 3. Losing signal loses the whole form

`ListingForm.tsx:23` holds roughly eighteen fields in one `useState` object with
no persistence. Close the tab, lose signal, or let the phone kill the background
tab, and everything typed is gone — including any photos already uploaded to
Cloudinary, which are then orphaned.

Persist the form state to `localStorage` on change and restore it on mount, keyed
per listing (new vs a specific id). Clear it on successful save. This is a small
amount of code and no new dependency; do not reach for a form library.

## 4. Nothing tells anyone a lead arrived

`src/actions/enquiries.ts` writes the `Lead` row and fires a PostHog event. There
is no email, no WhatsApp message, no push. Leads are visible only by opening
`/admin/leads` and looking.

A student who submits an enquiry on Friday night gets noticed whenever someone
next checks the page. For a product whose promise to owners is "answer within
about an hour," that is the gap that quietly kills the loop.

Add a notification on lead creation — only for real leads, the branch that writes
a `Lead`, never the click-counter branch. **Ask before choosing the channel**:
the project has no email or messaging credentials configured today, and the right
answer depends on what account Aangan already has. A plain `fetch` to an existing
service is the target; do not add a dependency, and do not invent credentials or
add new required env vars that break the build when unset. Follow the pattern
already used for Upstash and PostHog — the feature degrades silently when the
env var is absent, and the enquiry still saves.

The notification must never block or fail the enquiry: the student's submission
succeeding matters more than the alert being delivered.

## 5. Only one person can ever use the admin

`requireAdmin()` in `src/actions/admin.ts:19` and the guard in
`src/app/admin/layout.tsx:7` both compare `session.user.phone` against
`process.env.ADMIN_PHONE`. One phone number, set at deploy time. A second field
person cannot log in, and changing who the admin is needs an env change and a
redeploy.

The business is "we visit every PG in Kolhapur" — that is a field team, and the
software supports exactly one account. The `role` column already exists on `User`
and nothing reads it.

Switch both guards to read `role`, and provide a way to promote a user. Two
things must stay true:

- `ADMIN_PHONE` keeps working as the bootstrap, or the first admin can never log
  in — every new user is created with `role: "student"` in `src/lib/auth.ts` and
  nothing promotes anyone.
- Do not ship a half-wired guard. If promotion is out of scope for this pass,
  leave the phone check alone and say so, rather than reading a `role` that
  nothing ever sets.

State which approach you took and why.

## 6. The admin listings table on a phone

`src/app/admin/listings/page.tsx:31` wraps the table in `overflow-x-auto`, so it
scrolls rather than breaking the layout — that part is right. But a horizontally
scrolling table is a poor way to find and act on a listing from a phone.

Only if items 1 to 5 are done and verified: consider a card layout below `sm`,
with the actions (Mark full, Mark closed, Edit) as real buttons. This is the
lowest-value item here — skip it and say so if the rest took the time.

---

# Done means

`npx tsc --noEmit && npm run lint && npm run check && npm run build` all clean,
with zero lint warnings.

Verified by actually doing it, at 390px, not by reading the code:

- create a listing end to end on a phone-sized viewport, including tagging a
  photo as `bathroom` and publishing it
- select six photos in one action and watch them all upload
- fill half the form, reload the page, confirm the entered values come back
- submit an enquiry on that listing and confirm the notification arrives
- delete the test listing and confirm the property count is back to zero

Report what you completed, what you skipped, and why. If you skipped the
notification channel because you needed an answer from me, say what you need.

---

# Deliberately not doing

Owner self-serve listing. `/list-your-pg` has no form on purpose — owners call or
WhatsApp, and Aangan visits before anything goes live. That caps throughput at
how many PGs can be physically visited per week, and that cap **is** the product;
it is what "Aangan visited" means. Do not add an owner-facing submission form,
and do not add a bulk import.
