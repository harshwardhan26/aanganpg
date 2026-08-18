Build two printable Marathi documents that a PG owner signs on paper: the listing
agreement signed at the verification visit, and a short slip signed at the moment
a student's deal closes. Aangan's model is free for students, free to list, and a
one-time success fee from the owner when a bed is actually filled — these two
papers are what make that fee collectable.

Read `AGENTS.md` first; it is binding. Read the relevant guide in
`node_modules/next/dist/docs/` before writing any App Router or metadata code —
this Next version has breaking changes against most training data.

## Ground rules

**Marathi, simple words.** The reader is a PG owner in Kolhapur, often 45–65,
who has never signed a platform contract. Write the way a person speaks, not the
way a contract sounds. No English legal words transliterated into Devanagari, no
"पक्षकार", no clause numbering theatre. Short sentences. If a sentence needs to
be read twice, rewrite it.

**No amounts anywhere.** The fee is not decided yet. Every place money appears
must be a printed blank line the person fills in by hand at signing. Same for
dates, names, and property details. If you think a line cannot work without the
figure, stop and ask me.

**This is a draft for a person to review, not finished legal paper.** Say so in
your report. Before these are used with a real owner they need a look from a
local CA or advocate — I will arrange that. Do not add a disclaimer to that
effect *inside* the documents; just tell me in your summary.

**Two copies.** Both documents print with a line for the owner's signature and
Aangan's, and a note that one copy stays with each side.

---

# Document 1 — मालक करार (listing agreement)

Signed at the verification visit, before the listing goes live. One page. Two at
the absolute most — a two-page document that an owner will not read is worse
than a one-page document they will.

It has to cover, in plain Marathi:

**What Aangan does, free**
- visits the property in person
- takes the photographs, including the bathroom, at no cost
- puts the listing on the site at no cost
- sends students who have been contacted and verified

**What the owner agrees to**
- the photographs Aangan takes may be used on the Aangan site and in Aangan's
  publicity — this is a photo consent and it must be explicit, because Aangan is
  publishing pictures of someone else's building
- the rent, deposit, and facilities stated are correct on the day of signing, and
  the owner will tell Aangan when they change
- when an Aangan student comes to see the room, an Aangan person comes along and
  is present when the price is agreed
- the owner will answer a student's call or message reasonably quickly (the site
  already promises owners are asked for "about an hour" — keep it consistent, and
  keep it as an expectation, not a penalty clause)

**The fee**
- paid only when a student sent by Aangan actually takes a room
- paid once, from the first month's rent
- nothing afterwards — Aangan takes no share of any later month, ever
- the student pays Aangan nothing, so the rent is not inflated to cover it
- amount: a blank line
- when it is paid: on the day the student and owner agree the room. Say this
  plainly — it is the whole reason collection works.

**Ending it**
- either side can stop at any time, in writing or on WhatsApp
- listings already live come down within a stated number of days (blank line)
- a fee already earned before stopping is still owed

**Signature block**
Owner's name, PG name, full address, mobile number, date, signature. Same for
Aangan's representative. Space for both.

---

# Document 2 — रूम फायनल स्लिप (closing slip)

Half a page. This is the document that matters most for getting paid, and it is
the one an owner will actually sign without reading carefully — so it must be
short enough that reading it carefully takes ten seconds.

Signed on the spot, by owner and student both, when the room is agreed:

- student's name and mobile number
- PG name and room or bed identifier
- the monthly rent agreed — blank line
- the deposit agreed — blank line
- the date the student moves in — blank line
- one line confirming this student came through Aangan
- the fee amount and that it is being paid today — blank lines
- three signatures: owner, student, Aangan representative

That "came through Aangan" line is the entire point of the document. Word it so
it is a simple statement of fact that nobody feels defensive signing.

---

# How to build it

A print-only route under the admin area — `/admin/docs/agreement` and
`/admin/docs/slip`, or one route with a selector. Server components, printed
from the browser to PDF or straight to paper. No PDF library: `AGENTS.md`
forbids a dependency for what a print stylesheet does in a few lines.

**A4, portrait.** `@page { size: A4; margin: … }`. Test that Document 1 fits on
one sheet and does not orphan the signature block onto a second page.

**Print CSS.** Everything that is not the document itself — the admin header from
`src/app/admin/layout.tsx`, the site navbar and footer — must be hidden when
printing. Check what the admin layout wraps around the page before you assume.

**The logo.** `public/logo-dark.png` is the dark-on-light version and is the
right one for paper. `src/components/Logo.tsx` is an inline SVG that also works
and prints crisply at any size. Either is fine; put it top-left with Aangan's
contact number from `getAanganPhone()` in `src/lib/contact.ts` beside or below
it. Do not hardcode the phone number.

**The font is the trap that will bite you.** `src/app/layout.tsx` loads Poppins
with `subsets: ["latin"]` only. Devanagari glyphs are currently falling back to
whatever the system has — you can see this already on
`/kolhapur/room-rates`, which is entirely in Marathi. For a document that gets
printed and handed to a person, that fallback is not acceptable. Add the
`devanagari` subset to the existing font, or load a Devanagari face for these
pages specifically. Then actually look at the printed output — do not assume the
glyphs rendered correctly because the build passed. Check that joined characters
and matras sit right.

**Fill-in blanks** must be real printed lines with enough room to write on, not
underscores in a paragraph. Someone is filling these in with a pen, standing up,
possibly on a scooter seat.

---

# Done means

`npx tsc --noEmit && npm run lint && npm run check && npm run build` all clean,
with zero lint warnings.

Then, actually printed — to PDF is fine — and looked at:

- Document 1 is one page, or two with the signature block intact on the second
- Document 2 is half a page
- every Marathi character renders correctly, including matras and joined forms
- the logo prints sharp, not blurry or pixelated
- no site chrome, navbar, footer, or admin header appears on the paper
- no amount, name, or date is pre-filled anywhere
- the blanks are wide enough to write in by hand

Give me the full Marathi text of both documents in your report as plain text, not
just the file paths — I want to read the wording before anything gets printed,
and I will be sending that text to someone to review.
