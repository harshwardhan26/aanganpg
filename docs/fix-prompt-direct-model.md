# Fix prompts — direct-connection model

Written 19 August 2026. The business model changed. These prompts change the
product to match it.

**Supersedes and cancels `fix-prompt-routing.md` and `fix-prompt-ops.md`.**
Those two were written for a model where Aangan sat between the student and the
owner, escorted every visit, and took half the first month's rent. That model is
abandoned. Do not apply them. Delete them once these are done.

## The model now

- Aangan photographs PGs and lists them. Free.
- A student contacts the **owner directly**. Aangan does not escort, negotiate,
  or take money from anyone.
- Aangan takes **no commission**, and takes **no money from students, ever**.
- Aangan is free for owners **this season**, and will charge later, after demand
  is proven. That intent is disclosed everywhere from day one.
- The only thing Aangan keeps is the **lead record**: who asked for which
  listing. That record is the entire future business case, so it must be
  captured on every reveal without exception.

Everything below follows from those five lines. Where a prompt seems to be about
copy, it is usually about one of them.

Apply in order. Phase A is blocking — the rest can slip.

House rules in `AGENTS.md` apply to all of it, including "done means".

---

## Phase A — contact routing (blocking)

The escort model is hardcoded into the contact path. This is the change that
matters; everything else is words.

### Current state, verified

- `src/components/EnquiryActions.tsx:29-34` — a doc comment stating every contact
  route goes to Aangan and never to the owner, with the reasoning.
- `src/components/EnquiryActions.tsx:96` — the Call button dials
  `telLink(aanganPhone)`.
- `src/components/EnquiryActions.tsx:104-112` — the WhatsApp button messages
  `aanganPhone`.
- `src/actions/enquiries.ts:35` — when an enquiry arrives with no name and no
  phone it fires a PostHog event keyed on IP and **writes nothing to the
  database**. Every Call and WhatsApp click today takes this branch, so no
  `Lead` row is ever created for them.
- `src/lib/auth.ts:70` — `session.user.phone` is populated. The sign-in gate in
  `EnquiryActions` already forces authentication before any contact action.

So the identity is already in hand at the moment of contact. It is simply not
being written down.

### Prompt

> In `src/components/EnquiryActions.tsx`, split the two contact routes. They no
> longer go to the same place.
>
> **Call goes to the owner. WhatsApp goes to Aangan.**
>
> - Accept the owner's phone as a prop (`ownerPhone: string | null`), passed from
>   the server component that renders this. The value is `Property.ownerPhone`,
>   already stored in E.164.
> - The Call button dials `ownerPhone`. Relabel it "Call Owner".
> - The WhatsApp button keeps targeting `getAanganPhone()`. Label stays
>   "WhatsApp".
> - Keep the existing authentication gate on both, exactly as it is. An
>   unauthenticated click opens the auth sheet and reveals nothing.
> - If `ownerPhone` is null, render the Call button disabled with a short
>   explanation rather than falling back to the Aangan number. A listing with no
>   owner phone cannot be published (`pgPublishIssues` enforces it), so this is a
>   defensive branch, not a normal path.
> - Replace the doc comment at lines 29-34. It documents the abandoned model and
>   is now actively misleading. State the new rule: Call reaches the owner
>   directly, WhatsApp reaches Aangan, both require sign-in first, and the point
>   of the gate is the lead record.
>
> The WhatsApp prefill text is specified in Phase F. Build that first or leave a
> TODO — do not invent a different format here.
>
> In `src/actions/enquiries.ts`, make every contact click write a `Lead`.
>
> - Read the NextAuth session inside `processEnquiry`. When the caller is
>   authenticated, use `session.user.phone` and the session name rather than
>   requiring `data.name` and `data.phone` from the client.
> - The `Lead` upsert path at lines 62-84 then runs for `call`, `whatsapp` and
>   `share` channels too, not only `form`. Keep the existing dedupe on
>   `(phone, propertyId)` — a second click updates `updatedAt` and `source`.
> - Keep the PostHog event. Keep the rate limit. Keep the anonymous branch for
>   genuinely unauthenticated callers, but it should now be unreachable from the
>   UI.
> - Never trust a phone number sent from the client when a session exists. The
>   session value wins.
>
> `getAanganPhone()` stays — it is now load-bearing for the WhatsApp route, not
> just for the help pages.
>
> Assertion in `scripts/selfcheck.ts`: the prefill builder produces a message
> containing the listing title, the price, and the listing URL.

### Acceptance

- An authenticated student tapping Call reaches the owner's number.
- An authenticated student tapping WhatsApp opens a chat with Aangan, prefilled
  with the full listing details.
- Either click produces exactly one `Lead` row, and a second click updates it
  rather than duplicating.
- An unauthenticated click reveals no number.

### One thing to be aware of before shipping this

WhatsApp routed to Aangan is an operational commitment, not just a link. Someone
has to answer it, quickly, during the arrival waves. A WhatsApp button that goes
unanswered for six hours is worse for the student than no button at all, because
they waited instead of calling. If nobody can watch the inbox on a given day,
the honest move is to point WhatsApp at the owner too for that period.

---

## Phase B — owner-facing copy

`src/app/list-your-pg/page.tsx` currently sells the abandoned model. Verified
lines:

- `:58` — "Students contact Aangan. We **bring them to you**."
- `:62` — "You only meet students who have **already seen the room** and asked to
  visit."
- `:78` — "Let us visit your property **at least once** for verification."
- `:82` — "Answer a student's call or message within **about an hour**."

The first two are now false. The third contradicts `/verification`, which states
in bold that Aangan gives no safety guarantee — do not use the word
"verification" for a photo visit. The fourth is a demand you have no standing to
make while the service is free.

### Prompt

> Rewrite `src/app/list-your-pg/page.tsx` for the direct-connection model.
>
> What the page must now say, in this order of prominence:
>
> 1. **Free photographs, free listing, this season.** Never the bare word "free"
>    without "this season" or an equivalent qualifier — anywhere on the site.
>    The intent to charge later is disclosed, not hidden, and disclosing it now
>    is what makes charging later a scheduled event rather than a betrayal.
> 2. **No money changes hands through Aangan.** Aangan takes nothing from
>    students and nothing from owners right now. Rent, deposit and every rupee
>    go directly from student to owner. Say this plainly — it is the single
>    sentence that answers the "why is this free" doubt owners actually raise.
> 3. **The student contacts you directly.** No middleman, no appointment through
>    Aangan.
> 4. **You can remove your listing with one phone call**, and it comes down.
> 5. **A photo visit takes about twenty minutes.**
>
> Remove entirely: any claim that Aangan brings students, screens them, escorts
> them, or that the owner only meets pre-qualified visitors. Remove the
> response-time obligation at `:82`. Remove the word "verification" for the
> photo visit — call it a photo visit.
>
> Do not state a fee, a future price, or a date for one. "Later, with notice"
> is the whole commitment.
>
> Add nothing about student volume, traffic, or demand. There is none yet and
> the claim is checkable.

---

## Phase C — student-facing copy

### Prompt

> Sweep the student-facing surfaces — `src/app/page.tsx`, `src/app/about/page.tsx`,
> `src/app/pg/[slug]/page.tsx`, `src/components/RoomCard.tsx` — for three claims
> that are no longer true or were never true.
>
> 1. Any suggestion that Aangan accompanies a student, arranges a visit,
>    negotiates, or stands between the student and the owner. Gone. The student
>    gets the owner's number and deals with the owner.
> 2. `src/app/about/page.tsx:44` says the team "check amenities, **verify
>    safety**, and take the real photos". `/verification` says in bold that
>    Aangan provides no safety guarantee. The About page is wrong and must
>    change: photographs and details are checked, safety is not.
> 3. Anywhere "free" appears for students, keep it — it is true and permanent,
>    students are never charged. Only the owner-facing "free" needs the "this
>    season" qualifier.
>
> Add one line where a student first sees contact options: Aangan never asks a
> student for money, and never collects booking amounts or deposits. This is a
> safety instruction as much as a marketing line — it is what protects a student
> from someone impersonating Aangan later.

---

## Phase D — legal and compliance

Current state, verified: `/terms` has five generic sections, `/privacy` has
five, and the string "grievance" does not appear anywhere in `src/app`.

### Prompt

> **1. Grievance officer.** Under the IT Rules 2021, a platform hosting
> third-party content must publish a grievance officer's name and contact,
> acknowledge complaints within 24 hours and resolve within 15 days. Add a
> section to `src/app/terms/page.tsx` and a link in `src/components/Footer.tsx`
> carrying the officer's name, an email address and a postal address. Read the
> values from environment variables with a build-time failure in production if
> absent, matching the pattern already used by `getAanganPhone()` in
> `src/lib/contact.ts`.
>
> **2. Privacy policy to DPDP standard.** Rewrite `src/app/privacy/page.tsx` to
> state: what is collected (name and phone at sign-in; which listings were
> contacted), why, that the name and phone are shared with the owner of a
> listing the student contacts, how long it is kept, how to withdraw consent,
> and how to request deletion with a contact for doing so. Plain language, no
> boilerplate padding.
>
> **3. "Not an agent" in the terms.** Add a section to
> `src/app/terms/page.tsx` stating that Aangan lists properties, is not a broker
> or agent, is not a party to any rent agreement, does not handle rent, deposit
> or booking money, and charges students nothing. Also state that accuracy of
> rent, availability and facilities is the responsibility of the listing owner.
>
> **4. Collection notice at the point of collection.** One short line in the
> auth sheet (`src/components/auth/AuthSheet.tsx`) shown before a student signs
> in, in English and Marathi: their name and number are shared with the PG owner
> so the owner can respond, are given to no one else, and can be deleted on
> request. Link it to `/privacy`.

---

## Phase E — lead dashboard in admin

You already built this once. `~/Desktop/Aangan.com` — your real-estate project —
has `src/app/dashboard/` with `activity/`, `clients/`, `enquiries/` and
`listings/`, plus `src/actions/dashboard.ts` and `src/actions/leads.ts`. Read
those before designing anything here. Port the shape; do not reinvent it.

The gap in this repo is the `Lead` model. Current state, `prisma/schema.prisma:125`:
`id, name, phone, propertyId, status, source, notes, createdAt, updatedAt`.
The reference model additionally carries `stage`, `followupDate`,
`lastMessageAt`, and `rawMessage`. Those four are what turn a list into a
dashboard you can work from.

### Prompt

> **1. Extend the `Lead` model** in `prisma/schema.prisma` with `stage`
> (String, default "New Lead"), `followupDate` (DateTime?), `lastMessageAt`
> (DateTime?) and `rawMessage` (String?). Match the field names in
> `~/Desktop/Aangan.com/prisma/schema.prisma:159` exactly — you will port code
> between these two projects and divergent names will cost you later. Add an
> index on `(propertyId, createdAt)`. Write the migration; do not use `db push`
> against a database that has real leads in it.
>
> **2. Build `/admin/leads`** as the dashboard. Three things on one page:
>
> - **Counters across the top:** leads today, last 7 days, last 30 days, total.
>   One `groupBy` query, not one query per counter.
> - **The lead table**, most recent first: student name, phone (tap to call),
>   PG title linking to the listing, channel (`call` / `whatsapp` / `share` /
>   `form`), stage, date. Filterable by stage and by property.
> - **Per-lead actions:** change stage, add a note, set a follow-up date. Inline,
>   no separate edit page.
>
> Stages, fixed list, no configuration UI: `New Lead`, `Contacted`, `Visited`,
> `Moved In`, `Lost`. Five is enough. Adding a sixth is one line when you need it.
>
> **3. Lead count per listing** on `/admin/listings`: total, and last 30 days.
> One `groupBy` over `Lead`, joined in memory — not a query per row. Add a sort
> control for most leads first.
>
> **4. On a single listing's admin view**, list that listing's leads with the
> same columns.
>
> Admin-only throughout, behind the existing `requireAdmin()` check in
> `src/actions/admin.ts`. Every new server action gets that check on its own —
> an exported async function in a `"use server"` file is a public HTTP endpoint
> whether or not a page links to it.
>
> No charts, no date-range picker, no CSV export, no email digests. Counters, a
> table, and stages. If a real need for export appears it is one more prompt.

### Why this matters more than it looks

This dashboard is the entire future pricing conversation. "Twenty-two students
asked about your PG last month" is the only sentence that will make an owner pay,
and you cannot say it from memory. Every week this ships late is a week of
evidence you cannot reconstruct.

---

## Phase F — WhatsApp

Two separate things, and only one of them is buildable this month.

### F1 — Rich prefill, ships now, needs no API

When a student taps WhatsApp, the message that opens is **outgoing from the
student to Aangan**. Everything you put in it lands in your inbox. That is how
"all the details of that PG reach us" gets solved with zero infrastructure.

> Build the prefill in a pure function in `src/lib/whatsapp.ts`, alongside the
> existing `whatsappLink`. Given a property, produce the message body:
>
> ```
> Namaskar, Aangan varun ha PG baghitla —
>
> {title}
> Bhade: {displayPrice}
> Thikan: {location}{landmark}
> Type: {occupancyType} · {genderPreference}
> Deposit: {deposit}
> Jevan: {foodType}
> Chalat antar: {walkMinutes} min
>
> {listingUrl}
>
> Mala yaa baddal maahiti hawi aahe.
> ```
>
> Skip any line whose value is null — do not print "Deposit: null" or an empty
> label. Take the fields from `Property`; they all exist on the model already.
>
> Keep it under about 400 characters of URL-encoded text. Long `wa.me` links get
> truncated by some Android WhatsApp builds, and a truncated link opens an empty
> chat, which looks broken.
>
> Assertion in `scripts/selfcheck.ts`: a property with null `deposit` and null
> `foodType` produces a message containing neither label, and still contains the
> title and the URL.

Pair it with the **WhatsApp Business app's built-in greeting message** — free,
no API, no verification. Set it once on the phone: a first-time sender gets an
instant auto-reply saying you have received the message and will reply shortly,
plus the line that Aangan never asks a student for money. It is generic rather
than per-PG, but at your current volume you follow up by hand in under a minute,
and a saved quick-reply makes that a two-tap job.

### F2 — WhatsApp Cloud API, later

A genuine per-PG auto-reply sent *to the student* needs the Meta WhatsApp Cloud
API: a Business account, business verification, a dedicated number, and template
approval. Verification alone runs days to weeks, so it cannot be in place for the
25 August wave.

You have already built this once. In `~/Desktop/Aangan.com`:

- `src/lib/whatsapp-api.ts` — Graph API calls, `sendText`, `sendTemplate`,
  `autoReplyText`, `maskPhone`, plus `encryptToken` / `decryptToken` for
  credentials at rest and `verifyWebhookSignature`.
- `src/app/api/webhooks/whatsapp/route.ts` — `GET` for the `hub.challenge`
  handshake, `POST` for inbound. It verifies the signature before parsing the
  body, stores the raw message, parses intent, and either updates an open lead or
  creates a new one.
- `src/actions/whatsapp.ts` and `src/components/dashboard/WhatsAppConnect.tsx`.
- A `WhatsAppMessage` model and a `WhatsAppIntegration` model in its schema.

> When you port it: copy `whatsapp-api.ts` and the webhook route close to
> verbatim, but simplify the integration model. The reference stores credentials
> **per agent**, because there each agent replies from their own number. Aangan
> has one number, so a single set of environment variables replaces the whole
> `WhatsAppIntegration` table and its encrypted-token handling.
>
> Two things to carry over unchanged, both security-critical:
>
> - **Verify the signature before parsing the body.** The reference does this at
>   `route.ts:40` and the comment above it says why. A webhook endpoint is public;
>   an unverified one lets anyone forge leads into your database.
> - **Store the verbatim inbound text** alongside anything you parse out of it.
>   A parsing miss must never lose what the student actually wrote.
>
> Skip the intent parser (`src/lib/intent.ts`) on the first port. It exists there
> to read budgets and localities out of free-text buyer messages. Your students
> arrive from a listing page, so you already know which PG they mean.

Do not start F2 until F1 has been running through at least one arrival wave. You
will learn what students actually ask, and that determines what the auto-reply
should say. Building the reply first means guessing.

---

## Phase G — list a PG from a phone

You will be standing in a PG with a phone and no laptop. The form has to survive
that. Several earlier blockers are already fixed — the photo controls are no
longer hover-only (`ListingForm.tsx:313` now uses
`opacity-100 [@media(hover:hover)]:opacity-0`), the file input has `multiple`
(`:340`), and the form persists to `localStorage` (`:50-70`). What remains is
the upload path and the tagging UI.

### G1 — Downscale photos in the browser before upload (the real blocker)

`src/lib/upload.ts` posts the **original file** straight to Cloudinary from the
browser. A current phone camera produces 4–12 MB per photo. Six photos is
roughly 50 MB, uploaded over 4G from inside a concrete building, sequentially,
with no retry. Two things go wrong: it takes several minutes and any single
timeout loses that photo, and Cloudinary unsigned presets carry a max file size
that large originals will simply exceed — the upload comes back rejected with a
size error after the wait.

> Add a `downscaleImage(file: File): Promise<File>` to `src/lib/upload.ts` and
> call it from `uploadImage` before building the `FormData`.
>
> - Decode with `createImageBitmap(file, { imageOrientation: 'from-image' })`.
>   The orientation flag matters: phone photos carry EXIF rotation, and a canvas
>   redraw without it silently turns portrait shots sideways. Every photo of a
>   room would come out rotated.
> - Scale so the longest edge is at most 1600px, preserving aspect ratio. Never
>   upscale — a smaller original passes through untouched.
> - Draw to a canvas, export with `toBlob(..., 'image/jpeg', 0.82)`, and wrap the
>   result back into a `File` keeping the original name.
> - Skip the whole path for files already under 500 KB, and for anything that is
>   not a raster image.
> - If `createImageBitmap` or `toBlob` is unavailable or throws, upload the
>   original. A downscale failure must never become an upload failure.
>
> Hand-write it. It lands around 35 lines, which is under the dependency rule in
> `AGENTS.md` — no `browser-image-compression` or similar.
>
> Extract the arithmetic as a pure function so it can be tested without a canvas:
> `fitWithin(width, height, max)` returning the target dimensions. Assertions in
> `scripts/selfcheck.ts`: a 4000×3000 image capped at 1600 gives 1600×1200; a
> 800×600 image capped at 1600 comes back 800×600 unchanged; a square 2000×2000
> gives 1600×1600.
>
> Expect roughly 200–400 KB per photo afterwards, against 4–12 MB now. That is
> the difference between a six-photo listing taking twenty seconds and taking
> six minutes.

### G2 — Retry a failed upload once

`ListingForm.tsx:87-98` loops through the files, catches a failure, records the
filename and moves on. On a mobile connection a large share of failures are
transient, and one retry recovers most of them.

> In `uploadImage`, retry once on network-level failure only — the `catch` around
> `fetch`. Do not retry when Cloudinary returns a non-ok response: that means the
> file was rejected, and sending it again produces the same rejection twice as
> slowly.
>
> Surface the retry in `uploadProgress` so a stalled phone does not look frozen:
> "Uploading 3 of 6 (retrying)…".

### G3 — Put the photo controls below the photo, not on top of it

`ListingForm.tsx:313` makes the overlay permanently visible on touch devices,
which fixed the original problem — the controls are reachable now. But it
introduced a new one: a `bg-black/50` scrim now sits over **every thumbnail, all
the time**, on exactly the devices you will be using. You are tagging photos you
cannot see, in a 128px-tall cell.

> Restructure each grid item for touch: the image on top with no overlay, and the
> tag `<select>` and Remove button in a normal stacked row underneath it. Drop
> the scrim, the `group` / `group-hover` machinery and the `[@media(hover:hover)]`
> variants entirely — one layout for both, simpler than what is there now.
>
> The cell is currently `h-32`; that height should apply to the image, not to the
> image plus its controls, or the controls will squeeze the photo to nothing.
>
> Keep the existing tag pill at `:325` — it is the fastest way to see at a glance
> which photos are still untagged, which is the thing that blocks publishing.

### G4 — Stale state during upload

`handleImageTag` (`:107`) and `removeImage` (`:114`) both do
`setFormData({ ...formData, ... })` off the render-time closure, while
`handleImageUpload` (`:90`) correctly uses the functional
`setFormData(prev => ...)`. Tag or remove a photo while an upload is still
running and the update is applied to a stale `images` array, dropping whichever
photo finished in between.

> Convert both to the functional form. Two lines, and it is a real data-loss bug
> on a slow connection, which is the only connection you will have.

### G5 — Touch targets on the form itself

The selects at `:188`, `:214`, `:227`, `:245` and `:263` use `p-2`, which lands
around 36px tall. `AGENTS.md` is mobile-first and the rest of the site holds a
44px minimum.

> Give every input and select in this form a `min-h-[44px]`. Check the whole form
> at 390px while you are in there.

### Acceptance

Not "it compiles". Take an actual phone, open the admin form on it, and enter a
real listing end to end: six photos straight from the camera roll, one tagged
bathroom, all fields, publish. If that works on a 4G connection, the phase is
done. If it does not, nothing else in this phase matters.

---

## Order and gating

**Before 25 August** (Round III reporting wave): Phase A, Phase F1, and Phase G.
Every contact click that lands before A and F1 ship is a lead you cannot
reconstruct — and without G you cannot enter a listing anywhere except at a
laptop in the evening, which costs you the photographs you took that morning.

**Next:** Phases B and C. Copy only, no risk.

**Before real traffic:** Phase D.

**Before the first pricing conversation:** Phase E. Not this season on current
planning, but it needs a month of leads behind it to be worth showing, so
shipping it late means the number is small when you finally need it big.

**After at least one arrival wave:** Phase F2, informed by what students actually
asked in F1.

After all of it: delete `docs/fix-prompt-routing.md` and
`docs/fix-prompt-ops.md`. Leaving prompts for an abandoned model in the
repository is how it gets half-rebuilt by accident six months from now.
