export const metadata = { alternates: { canonical: "/" } };
import { getRooms, getColleges, getLocations } from '@/actions/rooms';
import { RoomCard } from '@/components/RoomCard';
import Link from 'next/link';
import Image from 'next/image';
import { HeroSearchForm } from '@/components/HeroSearchForm';
import { ListPgButton } from '@/components/ListPgButton';
import { publicImage } from '@/lib/publicImage';
import {
  ShieldCheck, Camera, PhoneCall, Wallet,
  UserRound, Users, UtensilsCrossed, IndianRupee, ArrowRight,
} from 'lucide-react';

// No stock fallback, and no listing photo used as decoration. Until a file lands
// in public/images the slot renders as a gradient panel instead of somebody
// else's dahlias. Room photos appear in one place only: the room cards.
//
// The hero is currently a generated illustration, not a photograph, so its alt
// text says so and claims no provenance. Swap it for a real shot as soon as one
// exists — the site tells owners and students that the photographs are real, and
// this is the one image on it that isn't.

const PICKS = [
  { href: '/search?genderPreference=Female', label: 'Girls PG', file: 'images/pick-girls.jpg', Icon: UserRound, tint: 'from-[#cc4040] to-[#8f2b2b]' },
  { href: '/search?genderPreference=Male', label: 'Boys PG', file: 'images/pick-boys.jpg', Icon: Users, tint: 'from-slate-700 to-slate-900' },
  { href: '/search?food=yes', label: 'With mess', file: 'images/pick-mess.jpg', Icon: UtensilsCrossed, tint: 'from-amber-700 to-amber-900' },
  { href: '/search?maxPrice=6000', label: 'Under ₹6,000', file: 'images/pick-budget.jpg', Icon: IndianRupee, tint: 'from-emerald-700 to-emerald-900' },
];

const STEPS = [
  { Icon: ShieldCheck, title: 'We visit it', body: 'Every room, in person, before it goes up.' },
  { Icon: Camera, title: 'We shoot it', body: 'Bathroom included. No wide-angle tricks.' },
  { Icon: PhoneCall, title: 'Contact the owner', body: 'Get their number directly. No middleman.' },
  { Icon: Wallet, title: 'You pay ₹0', body: 'No brokerage. Rent goes to the owner.' },
];

export default async function Home() {
  const [rooms, colleges, locations] = await Promise.all([
    getRooms(),
    getColleges(),
    getLocations(),
  ]);

  const recentRooms = rooms.slice(0, 6);
  const heroImage = publicImage('images/hero.jpg');
  const verifiedCount = rooms.filter(r => r.verifiedAt).length;
  // Chips show shortName; sorting by `name` put "Bharati" before "CSIBER"
  // before "DYPCET" in an order that looked random on screen.
  const collegeChips = [...colleges].sort((a, b) =>
    (a.shortName || a.name).localeCompare(b.shortName || b.name),
  );

  return (
    <main className="bg-white">
      {/* HERO — full-bleed photograph, copy sits on top of it */}
      <section
        className={`relative isolate flex flex-col justify-end overflow-hidden bg-dark lg:min-h-[560px] lg:justify-center ${
          // Without a photograph the top of the hero is dead space, so the
          // gradient version is deliberately shorter.
          heroImage ? "min-h-[78svh]" : "min-h-[62svh]"
        }`}
      >
        {heroImage ? (
          <Image
            src={heroImage}
            alt="Illustration of a student room in Kolhapur, the Mahalaxmi temple visible through the window"
            fill
            priority
            sizes="100vw"
            // Portrait viewports crop a 1.83:1 image down to roughly a third of
            // its width. Centred, that lands on a blank wall and loses the
            // Mahalaxmi temple in the window — the only thing in the frame that
            // says Kolhapur. Bias the crop right on mobile; desktop shows it all.
            className="object-cover object-[78%_center] lg:object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#e05252] via-[#8f2b2b] to-[#0f172a]" />
        )}
        <div
          // The hero photograph is bright, so the scrim is heavy where the copy
          // sits: white body text needs 4.5:1, which needs roughly 0.85 alpha
          // over a near-white photo. The top stays light so the room shows.
          className="absolute inset-0 bg-gradient-to-t from-[#020617]/95 via-[#020617]/80 to-[#020617]/20"
        />

        <div className="relative mx-auto w-full max-w-[var(--content-max)] px-4 pb-10 pt-24 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-xl space-y-6">
            {verifiedCount > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                </span>
                {verifiedCount} {verifiedCount === 1 ? 'room' : 'rooms'} visited
              </span>
            )}

            <h1 className="font-heading text-4xl font-bold leading-[1.1] text-white sm:text-5xl lg:text-6xl">
              Rooms we have<br />actually seen.
            </h1>
            <p className="text-base text-white/90 sm:text-lg">
              Student PGs in Kolhapur. Zero brokerage.
            </p>

            <HeroSearchForm colleges={colleges} />
          </div>
        </div>
      </section>

      {/* QUICK PICKS — visual tiles, not a pile of chips */}
      <section className="mx-auto max-w-[var(--content-max)] px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
          {PICKS.map(({ href, label, file, Icon, tint }) => {
            const photo = publicImage(file);
            return (
              <Link
                key={href}
                href={href}
                className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl sm:aspect-[4/3] lg:aspect-square"
              >
                {photo ? (
                  <Image
                    src={photo}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${tint}`} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-black/10" />
                <div className="relative space-y-2 p-4">
                  <Icon className="h-6 w-6 text-white" strokeWidth={1.75} />
                  <span className="block font-heading text-base font-semibold leading-tight text-white">
                    {label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CAMPUSES — one swipeable row instead of a wrapping wall */}
      <section className="py-2 lg:py-6">
        <div className="mx-auto max-w-[var(--content-max)] space-y-3 px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-lg font-bold text-text-main">Near your campus</h2>
          <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
            {collegeChips.map(c => (
              <Link
                key={c.slug}
                href={`/search?college=${c.slug}`}
                className="inline-flex min-h-[44px] shrink-0 snap-start items-center rounded-full border border-border bg-light px-4 text-sm font-medium text-text-main transition-colors hover:border-primary-strong hover:text-primary-strong"
              >
                {c.shortName || c.name}
              </Link>
            ))}
          </div>

          {locations.length > 0 && (
            <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
              {locations.map(loc => (
                <Link
                  key={loc}
                  href={`/search?location=${encodeURIComponent(loc)}`}
                  className="inline-flex min-h-[44px] shrink-0 snap-start items-center rounded-full border border-border bg-light px-4 text-sm font-medium text-text-muted transition-colors hover:border-primary-strong hover:text-primary-strong"
                >
                  {loc}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* RECENTLY ADDED — swipe row on mobile, grid from sm up */}
      {recentRooms.length > 0 && (
        <section className="py-10 lg:py-16">
          <div className="mx-auto max-w-[var(--content-max)] px-4 sm:px-6 lg:px-8">
            <div className="mb-5 flex items-baseline justify-between gap-4">
              <h2 className="font-heading text-xl font-bold text-text-main lg:text-2xl">Recently added</h2>
              <Link href="/search" className="inline-flex items-center gap-1 text-sm font-medium text-primary-strong hover:underline">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 lg:gap-6 [&::-webkit-scrollbar]:hidden">
              {recentRooms.map(room => (
                <div key={room.id} className="w-[78vw] shrink-0 snap-start sm:w-auto">
                  <RoomCard room={room} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOW THIS WORKS — four short lines, not four paragraphs */}
      <section className="border-y border-border bg-light py-10 lg:py-16">
        <div className="mx-auto max-w-[var(--content-max)] px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 font-heading text-xl font-bold text-text-main lg:mb-10 lg:text-2xl">How this works</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4 lg:gap-8">
            {STEPS.map(({ Icon, title, body }) => (
              <div key={title} className="space-y-2">
                <Icon className="h-7 w-7 text-primary-strong" strokeWidth={1.75} />
                <h3 className="font-semibold leading-snug text-text-main">{title}</h3>
                <p className="text-sm leading-relaxed text-text-muted">{body}</p>
              </div>
            ))}
          </div>
          <Link href="/verification" className="mt-8 inline-flex items-center gap-1 font-medium text-primary-strong hover:underline">
            How we verify <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* OWNER CTA */}
      <section className="py-10 lg:py-16">
        <div className="mx-auto max-w-[var(--content-max)] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start gap-6 rounded-2xl bg-text-main p-6 text-white shadow-xl sm:p-10 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="font-heading text-xl font-bold sm:text-2xl">Own a PG?</h2>
              <p className="text-slate-300">Verified leads straight to your WhatsApp.</p>
            </div>
            <ListPgButton size="lg" className="w-full shrink-0 border-none bg-white font-medium text-text-main shadow-sm hover:bg-slate-100 md:w-auto">
              List your PG
            </ListPgButton>
          </div>
        </div>
      </section>
    </main>
  );
}
