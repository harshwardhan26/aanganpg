import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getRoomBySlug, getRoomSlugs, getRoomsNearCollege } from "@/actions/rooms";
import { cloudinaryUrl } from "@/lib/image";
import { SaveButton } from "@/components/SaveButton";
import { RoomGallery } from "@/components/RoomGallery";
import { EnquiryActions } from "@/components/EnquiryActions";
import { RoomCard } from "@/components/RoomCard";

// Next 16: `params` is a Promise and must be awaited before its properties are
// read. Reading it synchronously logged a sync-dynamic-apis warning on every
// request and is removed in a future major.
type Props = { params: Promise<{ slug: string }> };

/**
 * The listing page is served from cache and rebuilt in the background.
 *
 * Every uncached render costs three sequential round trips to a Postgres in
 * another continent (~266ms each), which measured out at 4.5 req/s and a 3.2s
 * p50 under 20 concurrent students. Admin edits do not wait for this window:
 * `updateListing` already calls `revalidatePath("/pg/" + slug)`.
 */
export const revalidate = 300;

/**
 * Without this the segment stays server-rendered on demand and `revalidate`
 * buys nothing — the same reason `/kolhapur/[collegeSlug]` has one. Listings
 * added after a build are still generated on first request and then cached.
 */
export async function generateStaticParams() {
  const slugs = await getRoomSlugs();
  return slugs.map((slug) => ({ slug }));
}

/**
 * `generateMetadata` and the page both need the same room. Without this they
 * each issued their own query for it — one whole round trip per request spent
 * fetching a row we already had.
 */
const getRoom = cache(getRoomBySlug);

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoom(slug);
  if (!room) return { title: "Room not found" };

  const near = room.college ? ` near ${room.college.name}` : "";
  const ogImage = room.imageUrl ? cloudinaryUrl(room.imageUrl, 1200) : undefined;

  return {
    title: `${room.title}${near} — ${rupees(room.price)}/month`,
    description:
      room.description ||
      `${room.occupancyType ?? "Student"} room${near} in Kolhapur at ${rupees(room.price)} a month. ` +
        `Visited in person by Aangan. Contact the owner directly to see it — students pay no brokerage.`,
    alternates: { canonical: `/pg/${room.slug}` },
    openGraph: ogImage
      ? { images: [{ url: ogImage, width: 1200, height: 675, alt: room.title }] }
      : undefined,
  };
}

/** One row of the parent block. Rendered only when there is an answer. */
function Answer({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-0 sm:flex-row sm:gap-4 sm:py-3.5">
      <dt className="shrink-0 text-sm font-medium uppercase tracking-wide text-text-muted sm:w-44">
        {label}
      </dt>
      <dd className="text-text-main">{children}</dd>
    </div>
  );
}

export default async function RoomPage({ params }: Props) {
  const { slug } = await params;
  const room = await getRoom(slug);
  if (!room) notFound();

  const isClosed = room.closedAt != null;
  const nearby = room.college
    ? (await getRoomsNearCollege(room.college.slug)).filter((r) => r.id !== room.id).slice(0, 3)
    : [];

  const priceLabel = `${rupees(room.price)}/month`;
  // Absolute, because it is pasted into a WhatsApp message to us.
  const listingUrl = new URL(`/pg/${room.slug}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').toString();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Accommodation",
    name: room.title,
    description: room.description ?? undefined,
    image: room.images.map((i) => cloudinaryUrl(i.url, 1200)),
    address: {
      "@type": "PostalAddress",
      addressLocality: room.location ?? "Kolhapur",
      addressRegion: "Maharashtra",
      addressCountry: "IN",
    },
    numberOfBedrooms: undefined,
    offers: {
      "@type": "Offer",
      price: room.price,
      priceCurrency: "INR",
      availability: isClosed
        ? "https://schema.org/SoldOut"
        : "https://schema.org/InStock",
    },
  };

  const prefillData = {
    title: room.title,
    displayPrice: priceLabel,
    location: room.location,
    landmark: room.landmark,
    occupancyType: room.occupancyType,
    genderPreference: room.genderPreference,
    deposit: room.deposit,
    foodType: room.foodType,
    walkMinutes: room.walkMinutes,
    listingUrl,
  };

  return (
    <main className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="relative">
        <RoomGallery images={room.images} title={room.title} />
        <div className="absolute right-4 top-4 z-10">
          <SaveButton propertyId={room.id} size="default" />
        </div>
      </div>

      <div className="mx-auto max-w-[var(--content-max)] px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12 lg:px-8">
        {/* ---------------- main column ---------------- */}
        <div className="space-y-10">
          <header className="space-y-3">
            {isClosed && (
              <p className="inline-block rounded-full bg-muted px-3 py-1 text-sm font-semibold text-text-muted">
                Rented out — the owner is no longer taking enquiries
              </p>
            )}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="font-heading text-2xl font-bold text-text-main sm:text-3xl">
                  {room.title}
                </h1>
                {(room.landmark || room.location) && (
                  <p className="mt-1 text-text-muted">
                    {[room.landmark, room.location].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <div className="text-left sm:text-right shrink-0">
                <span className="block text-2xl font-bold text-text-main">
                  {rupees(room.price)}
                </span>
                <span className="text-sm text-text-muted">per bed / month</span>
              </div>
            </div>

            {/* A named person on a stated date, not an anonymous tick. A badge
                nobody can attribute is the trust signal students already
                discount. */}
            {room.verifiedAt && (
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-light px-3 py-1.5 text-sm text-text-main">
                <span className="h-2 w-2 rounded-full bg-primary-strong" aria-hidden />
                Aangan visited{" "}
                {room.verifiedAt.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {room.verifiedBy ? ` · ${room.verifiedBy}` : ""}
              </p>
            )}
          </header>

          {/* THE PARENT BLOCK — above the amenity grid on purpose. The person
              being convinced is a fifty-year-old reading a forwarded WhatsApp
              message on a six-inch screen, and these are the questions they
              ask before they ask the rent. */}
          <section aria-labelledby="answers" className="rounded-xl border border-border bg-light p-5 sm:p-6">
            <h2 id="answers" className="font-heading text-xl font-bold text-text-main">
              The short answers
            </h2>
            <dl className="mt-2">
              {room.college && (
                <Answer label="College">
                  {room.college.name}
                  {room.walkMinutes != null && ` — ${room.walkMinutes} min walk`}
                </Answer>
              )}
              {room.occupancyType && <Answer label="Sharing">{room.occupancyType}</Answer>}
              <Answer label="Who it is for">
                {room.genderPreference === "Female"
                  ? "Girls only"
                  : room.genderPreference === "Male"
                    ? "Boys only"
                    : "Anyone"}
              </Answer>
              <Answer label="Food">
                {room.foodType
                  ? `${room.foodType}${room.messNote ? ` — ${room.messNote}` : ""}`
                  : "No mess. Cooking or outside food."}
              </Answer>
              <Answer label="Warden">{room.wardenName || "None on site"}</Answer>
              {room.gateClosingTime && (
                <Answer label="Gate closes">{room.gateClosingTime}</Answer>
              )}
              <Answer label="Deposit">
                {room.deposit != null ? rupees(room.deposit) : "Ask the owner"}
              </Answer>
              <Answer label="Beds free">
                {room.vacantBeds == null
                  ? "Ask Aangan"
                  : room.vacantBeds === 0
                    ? "Full right now"
                    : room.vacantBeds}
              </Answer>
            </dl>
          </section>

          {room.rules.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-heading text-xl font-bold text-text-main">House rules</h2>
              <ul className="flex flex-wrap gap-2">
                {room.rules.map((rule) => (
                  <li
                    key={rule}
                    className="rounded-full border border-border bg-white px-3 py-1.5 text-sm text-text-main"
                  >
                    {rule}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {room.amenities.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-heading text-xl font-bold text-text-main">
                What&apos;s in the room
              </h2>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {room.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-text-main">
                    {/* A tick, not a star: a star beside "Attached Bathroom"
                        claims a rating nobody gave. */}
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 shrink-0 text-primary-strong"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M4 12.5l5 5L20 6.5" />
                    </svg>
                    {a}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {room.description && (
            <section className="space-y-3">
              <h2 className="font-heading text-xl font-bold text-text-main">About this room</h2>
              <p className="whitespace-pre-wrap leading-relaxed text-text-main">
                {room.description}
              </p>
            </section>
          )}

          <p className="text-sm text-text-muted -my-2">
            Every room here was visited in person and photographed by us.{" "}
            <Link href="/verification" className="inline-block py-2 text-primary-strong underline underline-offset-4">
              What &ldquo;Aangan visited&rdquo; means
            </Link>
            .
          </p>
        </div>

        {/* ---------------- contact ---------------- */}
        {!isClosed && (
          <aside className="mt-10 lg:mt-0">
            <div className="hidden rounded-xl border border-border border-t-4 border-t-primary-strong bg-white p-5 shadow-md lg:sticky lg:top-24 lg:block">
              <p className="mb-4 text-sm leading-relaxed text-text-muted">
                Contact {room.ownerName || "the owner"} directly to see this room.
                <strong className="block mt-2 text-text-main font-medium">Safety note: Aangan never asks a student for money, and never collects booking amounts or deposits.</strong>
              </p>
              <EnquiryActions
                propertyId={room.id}
                title={room.title}
                displayPrice={priceLabel}
                location={room.location}
                listingUrl={listingUrl}
                ownerPhone={room.ownerPhone}
                prefillData={prefillData}
              />
            </div>

            {/* Mobile: inline secondary row */}
            <div className="mt-8 lg:hidden">
              <EnquiryActions
                propertyId={room.id}
                title={room.title}
                displayPrice={priceLabel}
                location={room.location}
                listingUrl={listingUrl}
                ownerPhone={room.ownerPhone}
                prefillData={prefillData}
                variant="secondary-only"
              />
            </div>

            {/* Mobile: fixed bar. The contact controls have to be reachable at
                every scroll position — this is the only thing the page is for. */}
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.06)] lg:hidden">
              <EnquiryActions
                propertyId={room.id}
                title={room.title}
                displayPrice={priceLabel}
                location={room.location}
                listingUrl={listingUrl}
                ownerPhone={room.ownerPhone}
                prefillData={prefillData}
                variant="primary-only"
              />
            </div>
          </aside>
        )}
      </div>

      {nearby.length > 0 && (
        <section className="mx-auto max-w-[var(--content-max)] px-4 pb-16 sm:px-6 lg:px-8">
          <h2 className="mb-5 font-heading text-xl font-bold text-text-main">
            Other rooms near {room.college?.shortName || room.college?.name}
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-[repeat(auto-fill,minmax(272px,1fr))]">
            {nearby.map((r) => (
              <RoomCard key={r.id} room={r} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
