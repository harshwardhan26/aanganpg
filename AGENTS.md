# Aangan — house rules

## Next.js
This Next version has breaking changes against most training data. Read the
relevant guide in `node_modules/next/dist/docs/` before writing App Router,
routing, caching or metadata code. Heed deprecation notices.

## Styling
- This is a mobile-first web application. Default to mobile layouts and scale up using `sm:`, `md:`, `lg:` utilities as needed.
- Tailwind utilities and shadcn components only.
- New CSS goes into `globals.css` as a design token, or nowhere.
- Never write a bare element selector (`section`, `a`, `h2`, `img`) that sets
  layout properties. A previous version of this product had
  `section:not(.hero) { padding: 80px 5% }` at specificity (0,1,1) silently
  overriding every single-class rule in the file.
- `overflow-x: clip`, never `overflow-x: hidden`, on `html`/`body`. `hidden`
  makes the element a scroll container and breaks every `position: sticky`
  descendant on the site.
- Every `next/image` with `fill` gets an explicit `object-fit`. The default is
  `fill`, which stretches photographs. The photographs are the product.

## Contrast is a build rule
Body text >= 4.5:1, large text >= 3:1, against its actual background.
The brand coral `#fa5a5a` is 3.15:1 on white and MUST NOT carry white text.
Filled buttons use `--primary-strong` `#cc4040` (4.80:1).
WhatsApp green `#25d366` takes dark green `#05391a` on top, never white (1.8:1).

## Data
- Every list-shaped field is a real array column filtered with Prisma `hasEvery`.
  Never a comma-joined string.
- Phone numbers are stored E.164 through `canonicalPhone()`. One format, always.
- Never write a fallback that treats 0 as absent (`Number(x) || 1000`).

## Dependencies
No new dependency for anything under about 40 lines.

## Done means
`npx tsc --noEmit && npm run lint && npm run check && npm run build` all clean,
and the page rendered and eyeballed at 390px and 1440px.
Every non-trivial pure function leaves one assertion behind in
`scripts/selfcheck.ts`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
