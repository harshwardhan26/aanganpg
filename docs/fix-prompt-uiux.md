Fix the UI/UX and copy findings from the design review. This is a design and
content pass, not a functionality change — no new features, no new routes, no
new dependencies.

Read `AGENTS.md` first; it is binding, and several findings below are violations
of rules already written there. Read the relevant guide in
`node_modules/next/dist/docs/` before touching App Router or metadata code — this
Next version has breaking changes against most training data.

Work in the three phases below and stop after each one so I can look at it.
Phase 1 is credibility damage and ships on its own.

Do not touch `src/app/pg/[slug]/page.tsx`'s "short answers" section,
`src/components/RoomGallery.tsx`, or the 48px touch targets in
`src/components/SearchFilters.tsx` except where a finding names them. Those are
the parts that are working.

---

# Phase 1 — Credibility. Fix first, ship on its own.

## 1. Remove the stock photos from the About page

`src/app/about/page.tsx:36` and `:55` both render
`https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg` — the
Cloudinary demo account — as team photos, labelled "Harshwardhan — Founder &
Operations" and "Aangan Team — Local Verification Unit."

This product's entire claim is that we visit rooms and take the photographs
ourselves and never use owners' WhatsApp images. A stock photo of a stranger on
the About page contradicts that on the one page where a student checks whether
we are real. The same bug was already caught and removed from the homepage —
see the comment at `src/app/page.tsx:10`.

Do not substitute a different stock image, an illustration, an avatar, an
initials circle, or an AI-generated face. Any of those is the same lie in a new
costume. Remove the image blocks entirely and redesign that section to work
without photographs — names, roles, and a short line about who is actually doing
the visiting. Leave a clear `TODO` naming what real photo goes there when we
have one.

## 2. Rewrite the About page metadata

`src/app/about/page.tsx:6` claims "the most trusted student room platform in the
city." Unverifiable, self-awarded, and in direct conflict with `/verification`,
which is built entirely on stating what we do and do not check. That honesty is
the strongest asset on the site; do not undercut it in a meta description.

Replace with something defensible — built in Kolhapur, every room visited in
person, no brokerage from students. Keep it under 160 characters.

## 3. Replace every hardcoded `aangan.com`

Six occurrences:
- `src/app/kolhapur/[collegeSlug]/page.tsx:44` — canonical URL
- `src/app/kolhapur/[collegeSlug]/page.tsx:77`, `:83`, `:89` — breadcrumb JSON-LD
- `src/app/kolhapur/[collegeSlug]/page.tsx:100` — ItemList URL
- `src/app/kolhapur/room-rates/page.tsx:62` — WhatsApp share text

Every other page derives its URLs from `NEXT_PUBLIC_SITE_URL`, and
`next.config.ts` throws in production when it is unset precisely so this cannot
happen. If the live domain is not `aangan.com`, the 15 college landing pages —
the main SEO surface — are declaring canonicals on a domain we may not own.

Use `NEXT_PUBLIC_SITE_URL` for all six. The canonical in `generateMetadata` can
be a root-relative path, since `metadataBase` is already set in
`src/app/layout.tsx`; JSON-LD needs absolute URLs, so build those from the env
var.

Also note the share text points at `/rates`, which is not a route. The page is
`/kolhapur/room-rates`. Fix the path.

## 4. Link Terms and Privacy from the footer

`src/components/Footer.tsx:60-70` has a column headed "Legal" containing exactly
one item: "About Aangan." The real legal pages are reachable only from inside
the login sheet, so a signed-in user cannot find the Terms at all.

Put Terms and Privacy in the Legal column. Move "About Aangan" to Explore.

---

# Phase 2 — Copy, search, and components

## 5. One name for the differentiator

Four phrasings are in play for one concept: "Aangan visited" (card badge,
`RoomCard.tsx:56`), "We go to the room" (homepage step 1), "visited in person"
(hero counter), and "verified" (page titles, filters, `/verification`).

Standardise on **"Aangan visited"** — it states a fact, and it beats "verified,"
which every rental site in India claims and no student believes. Sweep all
user-facing strings. Retitle `/verification`'s H1 and metadata to describe what
"Aangan visited" means. Leave the route path alone.

## 6. Settle the language policy

Three incompatible policies today:
- `src/components/EnquiryActions.tsx:74` — Marathi WhatsApp prefill to owners.
  **Correct. Leave it.**
- `src/components/EnquiryActions.tsx:120` — the form heading `Aangan ला विचारा`,
  sitting under an English trigger button, above English "Your Name" and
  "Mobile Number" fields.
- `src/app/kolhapur/room-rates/page.tsx` — fully Marathi, including title and
  meta description.

Apply the rule **student UI in English, owner-facing communication in Marathi**.
That makes the form heading English. Leave the rates page in Marathi — it is a
forward-to-parents SEO play and Marathi is right for it — but add a visible
marker so it does not read as a broken page to an English-only student.

## 7. Cut the duplicated footer tagline

"Students pay us nothing." appears at `Footer.tsx:15` and again at `:75`, about
8rem apart. Delete the first; let the copyright line carry it.

## 8. Delete `src/components/EmptyRooms.tsx`

Zero imports anywhere in the codebase. Its copy ("Be the first to list a
property matching these criteria") addresses a landlord, but the component could
only ever render to a student who just searched. The inline empty state at
`src/app/search/page.tsx:64` is better written and is the one that actually
renders.

## 9. Unstick the search sidebar from behind the navbar

`src/app/search/page.tsx:49`:

```
className="... sticky top-8" style={{ height: 'calc(100vh - 4rem)' }}
```

The navbar is `sticky top-0` at `h-16` (4rem), so a sidebar sticking at `top-8`
(2rem) sits behind it. `src/app/pg/[slug]/page.tsx` already gets this right with
`lg:top-24`; match it.

That inline `style` is also the only one in the codebase and breaks the "new CSS
goes into globals.css as a design token, or nowhere" rule in `AGENTS.md`. A
`h-[calc(100vh-6rem)]` utility replaces it.

## 10. Stop promising a room count the button cannot know

`src/components/SearchFilters.tsx:176` renders `Show {roomCount} rooms`, but
`roomCount` is the count of the *current* results, not of the filters being
edited. Tick three amenities and the button still reads "Show 50 rooms"; submit
and get 2. It is a plain GET form, so the number cannot update client-side.

Relabel to "Show rooms" or "Apply filters" and drop the now-unused `roomCount`
prop from the component and both call sites. Do not add client-side state to
make the number live — that is a much bigger change than the problem deserves.

## 11. Add a sort control

Rent is the primary decision axis for this audience and there is no way to order
by it. Results currently come back verified-first, then newest.

Add a `<select name="sort">` to the existing GET form in `SearchFilters` with at
minimum "Price: low to high" alongside the current default, and honour it in
`getRooms`/`buildRoomWhere` in `src/actions/rooms.ts` and
`src/lib/room-filters.ts`. Keep the default ordering exactly as it is today when
no sort is given. Sorting is real logic, so leave one assertion behind in
`scripts/selfcheck.ts`.

## 12. Show active filters on mobile

`src/components/MobileFilterSheet.tsx:23` — the FAB reads "Filters" whether zero
or six filters are applied. A student who filtered, scrolled, and got thin
results has no way to see why without reopening the sheet.

Put the active count on the FAB ("Filters · 3"), and render the applied filters
as chips above the results grid on `search/page.tsx`, each removable by linking
to the same search minus that parameter.

## 13. Give the search page a real H1

`src/app/search/page.tsx:56` — the only heading on the page is a bare count
("50 rooms" / "12 rooms near CSIBER"). Weak for SEO and for screen readers.

Make the H1 descriptive ("PG and rooms near CSIBER", falling back to a sensible
generic when no college is selected) and demote the count to a subhead below it.

## 14. Let full rooms be saved

`src/components/RoomCard.tsx:59-68` — when `vacantBeds === 0`, the SaveButton is
replaced by a "Full right now" badge. That is the exact moment a student most
wants to save a room: right room, wrong timing, a bed frees up next month.

Show both — badge and heart — without overlapping. Also soften the card
treatment from `opacity-60 grayscale-[0.5]` to about `opacity-75` with colour
retained; the current treatment reads as "broken" rather than "unavailable."

## 15. Keep the mobile contact bar off the footer

`src/app/pg/[slug]/page.tsx:265` — the fixed bottom bar covers the top of the
footer at the end of the page. `main` carries `pb-28`, but the footer sits
outside `main`. Add the matching bottom padding where it actually clears the
bar.

## 16. Fix the card price alignment properly

`src/components/RoomCard.tsx:73` uses `mt-[-2px]` to compensate for line-height.
Use `items-baseline` on the flex row and delete the magic offset.

## 17. Style the hero form's validation

`src/app/page.tsx:60` — the college `<select>` is `required` with no error state,
so a student who submits empty gets the native browser bubble. This is the form
that starts the funnel. Add an inline styled message using existing tokens.

---

# Phase 3 — Design system

The system is defined in `src/app/globals.css` and then routed around. Close the
gap; do not expand the system.

## 18. Decide what `--primary` is for

`--primary` (`#fa5a5a`) is nominally the brand colour and appears nowhere in the
UI — every surface correctly uses `--primary-strong` (`#cc4040`) because of the
contrast rule in `AGENTS.md`. So the brand coral exists only as a variable, and
the site's actual identity colour is a dark brick red nobody chose.

Either give `--primary` a real job where contrast permits — large display type
at or above 24px, decorative fills, non-text accents — or rename it so it stops
claiming to be the primary. Do not weaken the contrast rule to make it fit.

## 19. Use the WhatsApp tokens that already exist

`--color-whatsapp` and `--color-whatsapp-dark` are defined in `globals.css` and
used nowhere. Both call sites hardcode hex in different casing:
`src/components/EnquiryActions.tsx:81` (`bg-[#25d366]`) and
`src/app/list-your-pg/page.tsx:74` (`bg-[#25D366]`). Switch both to the tokens.
Keep the dark-green text — white on WhatsApp green is 1.8:1 and is explicitly
forbidden.

## 20. Collapse the button height scale

Six heights are in use for three jobs: `h-10`, `h-11`, `h-12`, `h-14`, the
`h-[46px]` arbitrary value in `src/components/auth/AuthSheet.tsx`, and the
`py-4 sm:py-0 self-stretch` hero button in `src/app/page.tsx:70`.

Define three sizes — roughly 40 / 48 / 56 — as the Button component's variants
and convert every call site. No arbitrary height values left anywhere.

## 21. Write down the radius rule and apply it

`--radius-sm/md/lg` exist; components pick `rounded-md`, `rounded-lg`,
`rounded-xl`, `rounded-2xl`, and `rounded-full` by feel. Settle on inputs and
buttons `lg`, cards `xl`, hero and panels `2xl`, pills `full` — or your own
rule, stated once as a comment in `globals.css` — and make the components match.

---

# Done means

`npx tsc --noEmit && npm run lint && npm run check && npm run build` all clean,
with zero lint warnings, at the end of every phase.

Every page you touched rendered and eyeballed at 390px and 1440px — in
particular the About page after the images come out, the search page sidebar
against the sticky navbar, and the listing page's mobile contact bar at the
very bottom of the page where it meets the footer.

The sort logic from item 11 leaves one assertion in `scripts/selfcheck.ts`.

Stop after each phase and report what you changed, what you skipped, and why.
For item 1 in particular, tell me exactly what the About page shows now — do not
describe it as fixed if there is still a placeholder image of any kind on it.
