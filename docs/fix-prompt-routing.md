Aangan is moving to an owner-pays model: free for students, free to list, and the
owner pays a one-time success fee when Aangan actually fills a bed. Two things
follow — the site's copy currently claims Aangan takes no cut from anyone, which
will be false; and the introduction needs to route through Aangan so a rep is
present when the deal closes.

Read `AGENTS.md` first; it is binding. Read the relevant guide in
`node_modules/next/dist/docs/` before touching App Router, caching, or metadata
code — this Next version has breaking changes against most training data.

## Before you start — two things I have to answer

**The fee is not decided yet.** Do not write a rupee amount or a percentage
anywhere in the UI. Every string below is written to be true regardless of the
final number. If you think a line needs the figure to make sense, stop and ask.

**Part 2 has a product decision in it.** Read it before writing any code there.
Part 1 is decided and can be done on its own.

**The database is empty** (0 properties, 15 colleges) and `npm run seed` only
upserts colleges. Create fixtures through the admin form to see any of this, and
delete them when you are done.

This prompt overlaps `docs/fix-prompt-mobile.md` item 3, which splits
`EnquiryActions` so the mobile fixed bar carries only the primary buttons. If
that is already done, build on it. If not, do not do it here — just do not make
it harder.

---

# Part 1 — Copy. Decided, do this first.

Students still pay nothing. That stays true and stays loud. What changes is what
the site tells **owners**, because "we take zero cut" is about to be false.

## 1. `/list-your-pg` — the two false claims

`src/app/list-your-pg/page.tsx`, the "What we do" list:

- "Listing your property is **100% free**." — listing is still free, but the
  sentence now reads as "Aangan never charges me anything."
- "We take **zero cut or brokerage**." — this becomes false.

Rewrite that list so the offer is *pay on results*, which is a stronger pitch
than "free" anyway. The shape to aim for:

- We photograph your rooms for free.
- Listing is free. You pay only if we actually fill a bed.
- One payment, once, from the first month's rent. Never anything after that.
- Students pay us nothing — so nobody is inflating your rent to cover a fee.

That last line matters: it tells the owner why the student trusts the listing,
which is what makes the lead worth having.

Do not state the amount. Add a line pointing owners to ask on the call or the
WhatsApp message, both of which already exist on that page.

## 2. `/list-your-pg` — "What we ask"

Add a third item to that list, because it is now part of the deal and owners must
see it before they sign up: Aangan comes along to the student's visit and is
there when the price is agreed.

Word it as a service to the owner, not surveillance — Aangan brings a serious,
verified student and handles the introduction.

## 3. Homepage step 4 — leave it exactly as it is

`src/app/page.tsx`, "You pay us nothing / Zero brokerage. Zero hidden fees. You
only pay rent directly to your PG owner."

Every word of this is still true for students and it is now the sharpest line on
the site. Do not touch it. Do not soften it into "no hidden fees for students" —
the flat version is stronger and remains accurate.

Same for the footer's "Students pay us nothing" and the listing page's "Aangan
takes no brokerage from students." Both stay.

## 4. `/terms` — add the commercial relationship

`src/app/terms/page.tsx` currently says Aangan "acts as a discovery platform and
is not a party to any rental agreements." With a success fee from owners that is
no longer the whole picture.

Add a short, plain section: students are never charged; property owners may pay
Aangan a one-time fee when a listing results in a tenancy; Aangan is still not a
party to the rental agreement itself. Keep the register of the existing page —
short, plain, no legalese theatre. No amounts.

Update "Last updated".

## 5. `/verification` — do not touch

That page is the most persuasive thing on the site and none of it becomes false.
Leave it alone.

---

# Part 2 — Routing. Decide before you build.

## The problem

Today `src/components/EnquiryActions.tsx` puts the owner's number directly in the
student's hands: a `tel:` link and a `wa.me` link, both straight to `ownerPhone`.
A student can call, visit alone, and close the deal, and Aangan never knows it
happened. Under the new model that is an unpaid transaction and an owner who can
plausibly say the student came directly.

The fee needs an Aangan rep present when the price is agreed.

## The decision

There are three ways to route this and they trade brand against collectability:

**A. Keep the number public, log the reveal.** No change to what a student can
do. Cheapest, keeps "direct number" literally true, weakest collection.

**B. Number behind phone-verified login.** Student taps "Show owner's number",
the existing OTP sheet opens, the number appears and a `Lead` is written with
their verified phone, the property, and a timestamp. Gives real attribution
evidence. Still lets a determined student go alone.

**C. Primary CTA becomes "Book a free visit with Aangan", owner number behind
login as the secondary path.** Most students take the guided route because it is
the easier button; the number is still reachable, so the brand promise is not a
lie. Best fit for the model.

**Build C**, unless I say otherwise. Note what C costs: the homepage currently
promises "We give you the owner's direct mobile number. **No middlemen blocking
the conversation.**" Under C the number is still given, but a middleman is
plainly in the flow. That line has to change, and the honest reframe is that
Aangan comes with you — which a parent reading a forwarded WhatsApp link will
read as better, not worse. Rewrite it in that direction; do not quietly delete
the promise and replace it with nothing.

## What to build for C

In `src/components/EnquiryActions.tsx`:

1. **Primary button: "Book a free visit"** — a `wa.me` link to Aangan's own
   number from `getAanganPhone()` in `src/lib/contact.ts`, with a prefilled
   message naming the PG (title, price, and the listing URL) so whoever answers
   knows which room without asking. Follow the existing Marathi prefill pattern
   in that file — but this message is composed **by a student**, so it goes out
   in English per the language rule already applied in
   `docs/fix-prompt-uiux.md` item 6.
2. **Record it.** Call the existing `recordEnquiry` server action with a new
   channel value for this path, so it lands in `/admin/leads` alongside the
   others. Extend the channel union in `src/actions/enquiries.ts` rather than
   overloading an existing value — you will want to tell guided requests apart
   from raw clicks when you look at the numbers.
3. **Secondary: "Show owner's number"** — gated by the existing auth sheet. Copy
   the pattern from `src/components/SaveButton.tsx`: if unauthenticated, call
   `openAuthSheet(callback)` and reveal on success. On reveal, write a `Lead`
   with the student's verified session phone, the property id, and a distinct
   source, so you have timestamped evidence of exactly who was given which
   number and when.
4. **Keep Call and WhatsApp-the-owner working once revealed.** Do not remove
   them. The point is to route the default, not to wall off the number.
5. **Closed listings keep behaving as they do now** — no contact controls at all.

Do not touch `pgPublishIssues`. `ownerPhone` stays required on every listing;
Aangan needs it whether or not the student sees it first.

## Analytics

There is already a `trackEvent` helper in `src/lib/posthog.ts` and events fired
from `EnquiryActions`. Fire one for the guided-visit request and one for the
number reveal. You are about to want the ratio between them, and it is the
number that tells you whether C is working or whether students are routing around
it.

---

# Done means

`npx tsc --noEmit && npm run lint && npm run check && npm run build` all clean,
with zero lint warnings.

Verified by hand at 390px with a real listing in the database:

- "Book a free visit" opens WhatsApp with a message that names the right PG
- a logged-out student tapping "Show owner's number" gets the OTP sheet, and the
  number appears after verifying
- both actions produce rows in `/admin/leads` that are distinguishable from each
  other and from plain call/WhatsApp clicks
- a closed listing still shows no contact controls
- no rupee amount or percentage appears anywhere in the UI

Then delete the fixtures and confirm the property count is back to zero.

Report what you did, and flag anything in Part 1 where the new wording makes a
claim you are not certain is true — I would rather rewrite a sentence than ship
one that misleads an owner.
