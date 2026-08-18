Fix the mobile findings from the 390×844 audit, plus three bugs carried over from
the previous pass. About 99% of this product's audience is on a phone, so mobile
is not a variant of the desktop layout here — it is the product.

Read `AGENTS.md` first; it is binding. Read the relevant guide in
`node_modules/next/dist/docs/` before touching App Router, caching, or metadata
code — this Next version has breaking changes against most training data.

Two things before you start.

**The database is empty.** Zero properties, 15 colleges. `npm run seed` only
upserts colleges — it creates no listings, so `/search` and `/pg/[slug]` render
empty states and you cannot see any of the fixes below. Write a throwaway script
that creates four fixtures — one verified listing with four photos and every
field filled, one with `vacantBeds: 0`, one with a very long title and no photos,
one with `closedAt` set — then **delete those rows and the script when you are
done**. Do not leave test listings in the database and do not commit the script.

**There is an uncommitted partial fix in the tree.** `src/app/pg/[slug]/page.tsx`
had its `main` padding bumped from `pb-28` to `pb-40`. That does not fix item 2
below and you will probably replace it — read item 2 before deciding what to do
with it.

---

# Mobile

Ranked by damage to a phone user. Verify each at 390×844.

## 1. The photo gallery does not respond to swipe

`src/components/RoomGallery.tsx` has `onClick` arrows and a thumbnail strip and
no touch handlers at all. Every mobile user swipes a photo carousel first. On a
product whose entire pitch is that we took the photographs ourselves, a gallery
that ignores the gesture people actually use is the worst mobile defect on the
site.

Add touch handling — `touchstart`/`touchend` with a horizontal threshold is
about twenty lines and reuses the existing `go(delta)` function. **No carousel
dependency**: `AGENTS.md` forbids a new dependency for anything under about 40
lines, and this is well under. Keep the arrows and thumbnails for desktop, and
do not let a vertical scroll gesture register as a swipe.

## 2. The fixed contact bar hides the bottom of the footer

Measured at 390×844 at maximum scroll on `/pg/[slug]`:

```
bar top:       686     bar height: 154
copyright top: 772     → completely hidden behind the bar
"Privacy Policy"       → clipped through the middle of the text
at max scroll: true    → the user cannot scroll to reveal it
```

This is structural, not a padding value. `src/app/layout.tsx:44` renders
`<Navbar />{children}<Footer />`, so the footer is a sibling of the page and
sits **outside** `<main>`. No amount of padding on `main` can clear it — extra
padding pushes the footer further down, and at maximum scroll it still ends
flush with the viewport bottom, still underneath the bar. That is why the
uncommitted `pb-28` → `pb-40` change does not fix this.

Fix it where the footer can actually see it — bottom padding on the footer or on
`body`, applied only where the bar exists (mobile, listing pages). Whatever
value you choose must follow the bar's real height, which item 3 is about to
change, so do item 3 first.

## 3. The contact bar takes 154px of permanent screen

That is 18% of an iPhone 14 viewport, gone on every listing, forever. The
breakdown is a 48px button row, a 48px secondary row, 32px of padding, and gaps.

The bulk is the secondary row — "Owner not picking up? Ask Aangan instead" wraps
to two lines at 390px and sits beside the Share button.

Keep only Call and WhatsApp in the fixed bar, around 80px total, and move the
secondary row into the page body directly above the bar. That returns roughly
74px of permanent screen on every listing and gives the two buttons that matter
more visual weight, not less. `src/components/EnquiryActions.tsx` is used by both
the desktop sidebar and the mobile bar, so make the split a prop rather than
duplicating the component.

## 4. The hero college dropdown is a 24px tap target

`src/components/HeroSearchForm.tsx:29`. Measured height: **24px**. It is the
first interaction in the entire funnel.

The white box around it looks big because the parent `<div>` carries `px-4 py-3`,
but padding on the parent is not tappable area — only the `<select>`'s own box
is. Move the padding onto the `<select>` itself. The floor is 44px; the rest of
the site already uses 48px in `SearchFilters`.

## 5. Both bottom sheets use `vh` instead of `dvh`

- `src/components/MobileFilterSheet.tsx:35` — `h-[85vh]`
- `src/components/auth/AuthSheet.tsx:123` — `max-h-[90vh]`

On mobile, `vh` measures the viewport with the browser chrome hidden. With
Safari's or Chrome's URL bar visible, 85vh is taller than the visible area, so
the bottom of each sheet sits underneath the browser UI — and the bottom of each
sheet is exactly where "Apply filters" and "Send OTP" live. Switch both to
`dvh`.

Then verify by hand at 390px with the URL bar visible: open the filter sheet,
confirm Apply is reachable; open the login sheet, confirm Send OTP is reachable.

## 6. The hero advertises "0 rooms" with a pulsing live indicator

`src/app/page.tsx:57-59`. With an empty database the first thing a mobile
visitor sees is a green animated ping dot next to "**0** rooms Aangan visited".
An empty counter dressed as a live feed is worse than no counter.

Hide the whole block when `verifiedCount === 0`. Also fix the wording — "0 rooms
Aangan visited" is not a sentence; the terminology sweep broke the word order.

## 7. Touch targets below 44px

Measured at 390px:

| Element | Height | Location |
|---|---|---|
| Footer nav links | 20px | `src/components/Footer.tsx` |
| About phone link | 26px | `src/app/about/page.tsx` — a `tel:` link, on a phone |
| Logo link | 28px | `src/components/Navbar.tsx` |
| College chips | 38px | `src/app/page.tsx` |
| "What 'Aangan visited' means" | 40px | `src/app/pg/[slug]/page.tsx` |
| "Owner not picking up?" | 40px | `src/components/EnquiryActions.tsx` |
| `sm` size buttons | 40px | `src/components/ui/button.tsx` |

Raise the interactive ones to at least 44px. Prioritise the `tel:` link and the
footer links. For `sm` buttons, note this was a regression introduced when the
button scale was collapsed — while you are in that file, also fix that `xs`
(h-12) is currently **taller** than `sm` (h-10) and identical to `default`.

## 8. No `theme-color` meta

On Android Chrome the address bar stays default grey instead of taking the brand
colour. Add it to the metadata in `src/app/layout.tsx`. One line.

---

# Carried over

## 9. Removing a filter chip returns zero rooms

`src/app/search/page.tsx:77`:

```ts
const newParams = new URLSearchParams(searchParams as Record<string, string>);
```

`searchParams.amenities` is a `string[]` and that cast is a lie. `URLSearchParams`
stringifies array values, so two amenities collapse into one entry:

```
serialized:          college=kit&amenities=WiFi%2CHot+Water
getAll('amenities'): ["WiFi,Hot Water"]
```

Two consequences, both user-visible. The removal filter compares
`"WiFi,Hot Water"` against `"WiFi"`, never matches, so the chip you tapped is not
the one removed. And the resulting URL carries one comma-joined value into
`buildRoomWhere`, producing `hasEvery: ["WiFi,Hot Water"]`, which matches
nothing — so tapping any chip with two amenities active empties the page.

Build the params from the raw entries and append array values individually.
This is real logic, so leave one assertion in `scripts/selfcheck.ts`.

## 10. The gender radio applies a filter nobody chose

`src/components/SearchFilters.tsx:104`:

```
defaultChecked={currentGender === gender || (gender === 'Any' && !currentGender)}
```

"Anyone" is pre-checked whenever no gender is in the URL, so every filter submit
sends `genderPreference=Any`. `buildRoomWhere` then falls to its else branch and
sets `where.genderPreference = "Any"`, narrowing results to co-ed-only rooms and
silently dropping every Male and Female listing.

Set the default option's value to empty, or special-case `"Any"` in
`buildRoomWhere` to mean no filter — decide which, and say why. The same root
cause inflates the mobile FAB count, which reads "Filters · 2" after a submit
with nothing meaningful selected, because `genderPreference=Any` and an empty
`food=` both get counted in `MobileFilterSheet.tsx`. Fix that count too.

Add an assertion for whichever behaviour you settle on.

## 11. The About page claims something `/verification` explicitly disclaims

`src/app/about/page.tsx:44` — "check amenities, **verify safety**, and take the
real photos".

`/verification` says, in bold: "**No Safety Guarantees:** We do not provide any
guarantee regarding your physical safety, the security of your belongings, or the
behavior of the owner."

This is the same failure as the "most trusted platform" line that was removed
last pass, reintroduced two lines from where it was deleted. Cut "verify safety."
"Check amenities, confirm the facts with the owner, and take the real photos" is
true and loses nothing.

---

# Done means

`npx tsc --noEmit && npm run lint && npm run check && npm run build` all clean,
with zero lint warnings.

Every fix above eyeballed at **390px** — not just at 1440px, and not just in a
responsive-mode screenshot. Specifically confirm, with listings in the database:

- a swipe left and right moves the gallery, and a vertical scroll does not
- the footer's copyright line is fully readable at maximum scroll on a listing
- the filter sheet's Apply button and the login sheet's Send OTP button are both
  reachable with the browser URL bar visible
- tapping a filter chip with two amenities selected removes that one chip and
  keeps the other rooms
- applying only a budget filter does not silently drop non-co-ed rooms

Then delete the fixture rows and the fixture script. Confirm the property count
is back to zero before you report.

Report which items you completed, which you skipped, and why.

---

# Not in this pass — still open, do not lose these

- `markFull` / `markClosed` / `softDelete` revalidate nothing public —
  `src/actions/admin.ts:105-121`. A room marked closed stays live on the
  homepage, search, and sitemap until redeploy.
- `SENTRY_AUTH_TOKEN` is set nowhere, so production stack traces stay minified.
- `take: 50` in `src/actions/rooms.ts` silently caps the count shown on `/search`.
- `resolveSlug` in `src/lib/slug.ts` is an indirection whose tested branch
  production never takes; reverting the slug fix does not fail `npm run check`.
- CI skips `npm run build` with no note saying why.
- `src/app/global-error.tsx` still hardcodes `#cc4040` / `#b03030` and pulls in
  Inter as a second font family.
- `--brand-coral` is defined in `globals.css` and used nowhere.
- `--color-whatsapp` is applied in two of three places; every hover state is
  still raw hex in two casings.
- Roughly 23 files are uncommitted, including all of the last three passes.
