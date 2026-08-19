Make the site read as a Kolhapur product to a student on a phone, and make the
trust claim visible before any scrolling. This is a design and copy pass — no
new routes, no new dependencies, no data model changes.

Read `AGENTS.md` first; it is binding. Mobile-first is a rule there, not a
preference: every finding below is written for a 390px viewport and the desktop
layout follows from it, never the other way round. Read the relevant guide in
`node_modules/next/dist/docs/` before touching App Router or metadata code —
this Next version has breaking changes against most training data.

Work the phases in order and stop after each so I can look at it on a phone.
Phase 1 ships on its own.

Two things are out of scope here because they are content and infrastructure
problems, not UI ones: the database currently holds QA fixtures rather than real
listings, and `NEXT_PUBLIC_AANGAN_PHONE` is a placeholder. Do not paper over
either with UI. Where a finding depends on real data existing, say so and leave
the component correct for when it does.

---

# Who is actually reading this

The student opening this site is arriving in Kolhapur, not living in it. They
come from the smaller towns and the villages around the district — Gadhinglaj,
Ajara, Shirol, Radhanagari, the wadis off every one of those roads. Students
transferring in from another city the size of Kolhapur are the rare case, not
the common one.

That single fact should decide every wording and layout argument in this
document:

- They are renting for the first time in their life. They have no prior mental
  model of "listings", "filters", "amenities", or what is normal to ask an
  owner.
- Their schooling was very likely Marathi-medium. They read English, but
  English that a Pune marketing team wrote is a wall, and a word they have to
  stop and decode is a word that makes them close the tab.
- They are on a cheap Android phone, often on mobile data they are counting.
- They are frequently deciding with a parent standing next to them, who is
  reading the same screen and is the one asking whether this is safe.
- They are looking for a room *and* a mess, near a college they have not seen
  yet, in a city whose areas they cannot yet place on a map.

Design for that person and the site still works fine for the confident
English-medium student from Kolhapur city. The reverse is not true. Where a
finding below trades sophistication for plainness, take the plainness — every
time, without asking.

Two consequences worth stating outright, because they cut against normal
product instinct:

- **Fewer choices beats more control.** Every filter, sort option, and toggle is
  a decision this student has to have an opinion about. A screen with three
  obvious controls converts better here than one with nine good ones.
- **Say the thing, do not label the thing.** "Amenities" is a category name.
  "What you get in the room" is a sentence. Sentences win with this reader.

---

# The problem, stated once

A student in Kolhapur opens the site on a phone. The first screen is a heading
that says "Student rooms, actually verified.", a subheading, and a college
dropdown. Nothing on that screen says Kolhapur. The word appears in the `<title>`
(`src/app/layout.tsx:24`) and in a fallback paragraph inside the hero image box
(`src/app/page.tsx:82`) that only renders when there are no photos — and on
mobile that box sits below the fold anyway, because the hero is a
`grid-cols-1 lg:grid-cols-2` and the image column is second.

So the first impression is a generic listings site. Every other student rental
site in India opens the same way. The things that would make this one obviously
local and obviously ours — the college names, the area names, the count of rooms
we have physically walked into — are all further down the page or not on it at
all.

Fix that ordering. Nothing below asks for new features; it asks for the local
proof that already exists in the data to be moved above the fold and made to
look like evidence.

---

# Phase 1 — The first screen says Kolhapur and says why to trust us

## 1. Put the city in the `h1`

`src/app/page.tsx:41` reads "Student rooms,<br/>actually verified." Rewrite the
hero heading so the city is in the largest text on the page, not implied by it.
It must still fit two or three lines at 390px without the font size dropping
below what is there now — check it, do not assume.

Do not solve this by appending "in Kolhapur" as a smaller grey line under the
existing heading. That reads as a footnote. The city belongs in the heading
itself.

## 2. Make the verified count carry the city and survive an empty database

`src/app/page.tsx:52-62` renders "Aangan visited **N** rooms" with a pulsing
green dot, and only when `verifiedCount > 0`. This is the single strongest trust
element on the page and it is the smallest text in the hero.

- Say where. "N rooms visited across Kolhapur" is a different sentence to a
  student than "N rooms".
- Promote it visually — it should read as a claim, not as a caption. It stays
  below the search form; it does not become a badge floating over the hero image.
- Keep the `> 0` guard. An empty state that says "0 rooms visited" is worse than
  no line at all.
- The pulsing dot (`animate-ping`) is fine at one instance. Do not add a second
  animated element to this screen.

## 3. Anchor the hero to Kolhapur when there is no photograph

`src/app/page.tsx:76-86` is the no-image fallback: "Photographs coming this
week." It is honest and it should stay honest. But on mobile it is the second
screen, and it is currently the only place the city is named in the body copy.

Once Phase 1.1 lands, the heading carries the city and this box can stop doing
that job. Leave the copy honest about photographs. Do not substitute a stock
photo, an illustration, a map graphic, or an AI image — the same rule that
already removed stock photos from the homepage and About page applies here.
See the comment at `src/app/page.tsx:10`.

## 4. The navbar should say where this is — DONE, verify only

This one has already been applied: `src/components/Navbar.tsx:25` now renders a
"Kolhapur" mark beside the wordmark, and the header was rebuilt as
`flex-1 / flex-none / flex-1` which also fixed the logo overlapping the centre
nav links at 1440px. Confirm the contrast of that small grey text measures 4.5:1
against the header background and that nothing wraps at 390px, then leave it
alone.

Original finding, for context: `src/components/Navbar.tsx` rendered the `Logo`
alone. On a phone that is the
only persistent chrome — the desktop nav links are behind the hamburger and the
sticky header is what a student sees on every screen.

Add a locality mark next to the wordmark: small, subordinate to the logo, not a
second brand. It must not push the header past `h-16` at 390px and it must not
collide with the hamburger. Contrast rule applies — this is small text, so
4.5:1 against the header background, and the brand coral `#fa5a5a` does not
qualify for it on light. Use `--text-muted` or a token that measures.

---

# Phase 2 — Navigate the way a Kolhapur student actually navigates

## 5. Surface areas, not just colleges

`Property.location` already holds real Kolhapur localities — the current rows
carry `Rajarampuri`, `Shahupuri`, `Tarabai Park`. Nothing in the UI lets anyone
browse by them. `src/app/page.tsx:96-112` offers "Search by College" chips and
nothing else.

Note that `src/lib/property-options.ts` already holds `KOLHAPUR_LOCALITIES`,
twenty real areas, with a comment saying students search by college rather than
by locality and that the list is therefore for the listing form only. That
assumption is what this finding challenges — a student arriving from outside the
district cannot place a college on a map either, but they will have been told by
a relative to look in Rajarampuri. If you agree, update that comment as part of
the change; if you disagree after looking at the data, say so and stop here
rather than building the row half-heartedly.

Add an area chip row alongside the college chips, built from distinct
`location` values in the database, not from that constant — a hardcoded list
goes stale the first time we list a room in an area nobody thought of. Sort it
the same way the college chips are sorted (`src/app/page.tsx:28-30`, and read
the comment there — an unsorted chip row looked random on screen).

`src/lib/room-filters.ts` is where the filter parsing lives; the search page
already takes query params. Wire the chips to whatever param the existing filter
code supports rather than inventing a parallel one.

If a locality has no live listings, it does not get a chip. A chip that leads to
an empty results page is a broken promise on the most local-feeling control on
the site.

## 6. Give the section headings a voice

`src/app/page.tsx:99` and `:114` are "Search by College" and "Popular Shortcuts"
in `text-sm uppercase tracking-wider` grey. They read like form labels on an
admin panel. They are the labels above the most Kolhapur-specific content on the
page. Rewrite them as sentences a person would say, keep them short enough not
to wrap at 390px, and keep the existing visual weight — this is a copy change,
not a redesign.

"Popular Shortcuts" in particular describes the mechanism rather than the thing.
Girls PG, Boys PG, With mess, Under ₹6,000 are how a student describes what they
need.

## 7. Put the locality on the room card

The card at `src/components/RoomCard.tsx` currently shows the college shortName
under the title — "SUK". A student comparing two rooms wants to know the area as
well as the campus, and the area is the part that tells them the commute and the
rent band.

Show both, area first, in a way that does not force a second line at 390px on a
long area name. `Property.location` may be null; a card with no area must not
render a stray separator or an empty element.

---

# Phase 3 — Make the trust claim checkable

## 8. Link the homepage to `/verification`

The `/verification` page exists and is built on stating plainly what we do and
do not check. Nothing on the homepage links to it. The "How this works" section
(the four numbered steps ending at "You pay us nothing") makes four claims and
offers no way to verify any of them.

Add one link from that section to `/verification`. One link, in the section that
makes the claims. Not a card, not a banner, not a repeated CTA — the page
already ends with a "Are you a PG owner?" block and a second competing call to
action below the fold dilutes both.

---

# Phase 4 — Words this student already knows

Everything in this phase is a copy and defaults change. No new components, no
new routes. Read "Who is actually reading this" again before starting; every
finding here is an application of it.

## 9. One vocabulary for boys and girls, and it is not "Co-ed"

The site currently uses two different words for the same fact in two places a
student sees within one tap of each other:

- `src/components/Navbar.tsx:14-15` — "Girls PG", "Boys PG"
- `src/components/RoomCard.tsx:98-101` — "Female", "Male", and `'Any'` rendered
  as **"Co-ed"**

"Co-ed" is a word from English-medium school brochures. A student from a village
school has very likely never met it, and it is doing the most safety-relevant
job on the card — a parent reading over a shoulder needs to know instantly
whether this is a girls' PG.

Pick the navbar's vocabulary and use it everywhere a student can see: the card
tags, the filter labels, the listing page, the search chips. `Male`/`Female`/`Any`
stay as the stored `Property.genderPreference` values and stay as the admin
form's labels — this is a display change, not a data change. Do not migrate the
column.

## 10. Rewrite the filter labels as things a person would say

`src/components/SearchFilters.tsx` is where a first-time renter meets seven
category headings in a row:

- `:54` **"Sort By"** with `:60` **"Relevance"** as the default option. Nobody
  outside software knows what relevance means. If the default sort cannot be
  named in plain words, it does not need to appear in the list at all — an
  unlabelled default plus "Cheapest first" is two options instead of three.
- `:96` **"Gender"** — the student is not choosing a gender, they are choosing a
  kind of PG. See finding 9.
- `:134` **"Sharing"**, whose options are Single / Double / Triple / Shared
  (`src/lib/property-options.ts:OCCUPANCY_TYPES`). "Sharing: Shared" is
  circular. The question is *how many people sleep in one room*, and the answer
  a student gives is a number.
- `:149` **"Amenities"** — pure listing-site jargon. This is the list of what is
  in the room.
- `:67` **"Max Rent (Monthly)"** — the parenthetical is form-speak. Rent is
  monthly here; say it in the sentence or not at all.
- `:168` **"Rules"** is fine and stays.

Same treatment for `src/lib/property-options.ts`:

- `PG_AMENITIES` mixes registers: "RO Drinking Water", "Power Backup",
  "Two-wheeler Parking", "Lift". Nobody says two-wheeler out loud; they say bike
  or scooter. Rewrite the display strings toward what is spoken.
- `PG_RULES` — "No opposite-gender visitors" is bureaucratic for the one rule a
  parent will read most carefully. Say it plainly.

These arrays feed both the admin form and the student-facing display. If a
rewrite makes a good student label but a worse admin label, split the display
string from the stored value rather than compromising on the student side — but
only where it actually conflicts. Do not build a translation layer for all of
them on principle.

## 11. Cut the number of filters a student sees first

`src/components/MobileFilterSheet.tsx` opens onto every group at once. For this
reader that is seven decisions before any rooms appear.

Show the three that decide the search — college, girls/boys, max rent — and put
the rest behind one "More filters" disclosure. Everything stays reachable;
nothing is removed. The measure of success is how few taps stand between opening
the sheet and seeing results, and that is a thing to check at 390px on the
actual sheet, not to reason about.

Do not touch the 48px touch targets in `src/components/SearchFilters.tsx`. They
are correct and this audience is on cheap touchscreens where they matter most.

## 12. "Zero brokerage" is the promise, and it is the word most likely to miss

It appears in the hero (`src/app/page.tsx:44`), on `/list-your-pg`, and in the
"You pay us nothing" step. It is the single most important claim on the site for
a family counting money, and "brokerage" is a term of trade.

The word this student and their parent actually use is *dalali* / दलाली. This is
the strongest candidate on the whole site for a Marathi word carrying meaning
that the English cannot.

So, the language question, decided narrowly: **do not build site-wide i18n.** A
half-translated interface reads as broken software and costs more trust than the
localisation gains. What is in scope is the handful of places where the Marathi
word is simply the true word — this one above all, plus the area names, which
are proper nouns and must never be anglicised or "corrected" in display.

Try it in the hero and on `/list-your-pg` and look at it on a phone. If a
Marathi word inside an English sentence reads as a gimmick rather than as
plain speech, that is a real result — write down that you tried it and left it
in English, rather than forcing a token translation.

## 13. Make the money and the phone number unmissable

Two things this student came for: what it costs per month, and who to call. On
the card and on the listing page these should be the two elements that survive
squinting at the screen from arm's length.

Check on a real 390px screen that the rent and the call action are the strongest
elements in their block, and that the call action is visibly heavier than
"Save". Saving a listing is a feature for someone browsing at leisure; calling
is what someone with three days to find a room before term starts actually does.

The WhatsApp green `#25d366` takes dark green `#05391a` on top, never white —
that rule is in `AGENTS.md` and it applies to any new contact affordance.

---

# Done means

`npx tsc --noEmit && npm run lint && npm run check && npm run build` all clean,
and the homepage, `/search` and one `/pg/[slug]` rendered and eyeballed at 390px
and 1440px. Every non-trivial pure function you add or change leaves one
assertion behind in `scripts/selfcheck.ts` — the area-chip derivation in Phase 2
is one of these.

Contrast is a build rule, not a review comment: body text 4.5:1, large text
3:1, against the actual background it sits on. Anything new that uses the brand
coral carries dark text or uses `--primary-strong`.

One more check for Phase 4, and it is not optional: read every label you wrote
out loud as if explaining the screen to someone who has just got off the bus
from Gadhinglaj with a bag and an admission letter. Anything you would not say
in that conversation does not belong on the screen.
