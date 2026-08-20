# Fix prompt — map directions

Written 20 August 2026. One feature: a student taps a button on a listing and
their phone starts navigating to the PG.

## Why a link and not an embedded map

Decided deliberately, so nobody "upgrades" this later:

- A `maps/dir/?api=1` link opens the **Google Maps app** on a phone with
  navigation already started. An embedded iframe is a small rectangle the user
  has to pinch at, and it navigates nobody anywhere.
- The link needs no API key, no billing account, and no CSP change. The embed
  needs all three — the current policy in `next.config.ts:45` allows
  `frame-src 'self' https://*.firebaseapp.com` and nothing else.
- The embed costs money per page view. The link is free forever.

If a map view of search results ever makes sense, it is past fifty listings, not
now.

---

## 1. Schema

`Property` has no coordinates today.

> Add `lat Float?` and `lng Float?` to `Property` in `prisma/schema.prisma`.
> Nullable — most listings will not have a pin on day one and that must stay
> fine. Write a migration; do not `db push` against a database holding real
> listings.
>
> Do not add coordinates to `pgPublishIssues` in `src/lib/property-options.ts`.
> A missing pin must never block publishing. If geolocation fails in a stairwell
> with no signal, the listing still has to go up.

---

## 2. The link builder

> New pure function in `src/lib/maps.ts`:
>
> ```ts
> directionsUrl(lat: number | null | undefined, lng: number | null | undefined): string | null
> ```
>
> Returns `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`, or
> `null` when either value is absent.
>
> **Check `!= null`, never truthiness.** Latitude 0 and longitude 0 are real
> numbers, and `AGENTS.md` forbids treating 0 as absent — the same mistake is
> live right now in `src/lib/whatsapp.ts:69`. A `!lat` check would also throw
> away a legitimate pin.
>
> Second pure function in the same file:
>
> ```ts
> looksLikeKolhapur(lat: number, lng: number): boolean
> ```
>
> True inside roughly lat 16.4–17.0, lng 73.9–74.6. A deliberately generous box.
> This is a sanity check for the admin form, not a validation rule — it catches
> a swapped lat/lng, a stray minus sign, or a 0,0 that would otherwise put the
> PG in the Gulf of Guinea.
>
> Assertions in `scripts/selfcheck.ts`:
> - a known Kolhapur pair produces a URL containing both numbers
> - `directionsUrl(null, 74.2)` and `directionsUrl(16.7, undefined)` both return null
> - `directionsUrl(0, 0)` returns a URL, not null
> - `looksLikeKolhapur` is true for a Kolhapur pair, false for the same pair with
>   lat and lng swapped

---

## 3. Listing page

> In `src/app/pg/[slug]/page.tsx`, render a "Get directions" link wherever
> location is currently shown — the landmark/locality line is around `:157`, and
> the walk-minutes line around `:200`.
>
> - Plain `<a>` with `target="_blank" rel="noopener noreferrer"`, styled as a
>   secondary button, `min-h-[44px]`.
> - Render nothing at all when `directionsUrl` returns null. No disabled button,
>   no "location not available" line — an absent pin should be invisible, not
>   advertised.
> - It sits alongside Call and WhatsApp in the contact area, but it is not a
>   contact action: **do not put it behind the auth gate and do not record a
>   Lead for it.** Directions cost you nothing and gating them just loses the
>   student.
>
> While in this file, add coordinates to the existing JSON-LD near `:101`, which
> already sets `addressLocality`. A `geo` block with `latitude` and `longitude`
> is a few lines and is a real local-SEO win:
>
> ```
> geo: { "@type": "GeoCoordinates", latitude: room.lat, longitude: room.lng }
> ```
>
> Omit the key entirely when there is no pin — never emit nulls into structured
> data.

---

## 4. Capturing the pin in the admin form

This is the half that decides whether the feature has any data in it. You will
be standing inside the PG with a phone, which is the best possible moment to
record a location.

> In `src/app/admin/listings/ListingForm.tsx`, next to the Landmark field at
> `:237`, add a location row:
>
> **A "Use my current location" button.** `navigator.geolocation.getCurrentPosition`,
> browser-native, no key, no dependency. On success write `lat`/`lng` into
> `formData` and show the two numbers as text so it is obvious something was
> captured. On failure show the browser's own error — permission denied and
> timeout need different responses from you.
>
> Pass `{ enableHighAccuracy: true, timeout: 10000 }`. Default accuracy inside a
> building is poor enough to land you on the wrong street.
>
> **A paste field as fallback**, for entering a listing later at a laptop:
> accept a Google Maps URL and pull the coordinates out of the `@lat,lng` segment.
>
> **A "Clear" button.** A wrong pin is worse than no pin — it sends a student to
> the wrong gate — so removing one has to be one tap.
>
> Run `looksLikeKolhapur` on whatever is captured and show a warning when it is
> false. Warn, never block: you might legitimately be listing outside the box.
>
> Both fields go through the existing `localStorage` persistence at `:50-70`
> like every other field.

### Two things that will waste your afternoon if you do not know them

**`navigator.geolocation` only works in a secure context.** On `localhost` it is
fine. Opening the dev server from your phone at `http://192.168.x.x:3000` it will
silently fail — that is the browser, not your code. Test the button on the
deployed HTTPS site, or over a tunnel.

**Google's share links usually contain no coordinates.** A `maps.app.goo.gl/…`
short link has to be opened first before the URL carries `@lat,lng`. In the app,
long-pressing the pin and copying the coordinates directly is faster and always
works. Put that hint in the field's placeholder so you are not rediscovering it
in a doorway.

---

## 5. Save path

> In `src/actions/admin.ts`, add `lat` and `lng` to `listingSchema` at `:58` as
> nullable optional numbers, alongside `walkMinutes` at `:65`. They flow through
> `saveListing` like every other field. Nothing else changes.

---

## What not to build

No embedded map. No map view on search. No reverse geocoding to auto-fill the
address. No distance-from-college calculation — `walkMinutes` is already entered
by hand and a straight-line distance would contradict it, which is worse than not
having it.

## Acceptance

On a real phone, on the deployed site: open a listing with a pin, tap Get
directions, and the Google Maps app opens with navigation running to the right
gate. Then open the admin form at a PG, tap Use my current location, save, and
confirm the pin on the public page points at the building you are standing in.

`npx tsc --noEmit && npm run lint && npm run check && npm run build` clean, and
the listing page eyeballed at 390px and 1440px.
