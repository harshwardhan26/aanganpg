export const metadata = { alternates: { canonical: "/" } };
import { getRooms, getColleges } from '@/actions/rooms';
import { RoomCard } from '@/components/RoomCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { cloudinaryUrl } from '@/lib/image';

// No stock fallback. The hero used to fall back to Cloudinary's demo account,
// so a page promising "we took these photos ourselves" led with a picture of
// somebody else's dahlias.

export default async function Home() {
  const [rooms, colleges] = await Promise.all([
    getRooms(),
    getColleges(),
  ]);

  const recentRooms = rooms.slice(0, 6);
  // Prefer a verified room's cover: the hero is the promise of the product.
  const heroImage =
    rooms.find(r => r.verifiedAt && r.imageUrl)?.imageUrl ??
    rooms.find(r => r.imageUrl)?.imageUrl ??
    null;
  const verifiedCount = rooms.filter(r => r.verifiedAt).length;
  // Chips show shortName; sorting by `name` put "Bharati" before "CSIBER"
  // before "DYPCET" in an order that looked random on screen.
  const collegeChips = [...colleges].sort((a, b) =>
    (a.shortName || a.name).localeCompare(b.shortName || b.name),
  );

  return (
    <main className="min-h-screen bg-white">
      {/* HERO SECTION */}
      <section className="mb-16 lg:mb-24 bg-light pt-12 pb-16 lg:py-24 border-b border-border">
        <div className="max-w-[var(--content-max)] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            {/* Hero Text & Form */}
            <div className="space-y-10">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-main leading-tight font-heading">
                  Student rooms,<br/>actually verified.
                </h1>
                <p className="text-lg text-text-muted max-w-lg">
                  We visit every PG, take photos of the bathroom, and give you the owner&apos;s direct number. Zero brokerage.
                </p>
              </div>

              <form action="/search" method="get" className="bg-white p-2 rounded-xl shadow-md border border-border flex flex-col sm:flex-row gap-2 max-w-xl">
                <div className="flex-1 px-4 py-2 border-b sm:border-b-0 sm:border-r border-border flex flex-col justify-center">
                  <label htmlFor="college" className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Select College</label>
                  <select 
                    id="college" 
                    name="college" 
                    defaultValue=""
                    className="w-full min-h-12 bg-transparent text-text-main font-medium focus:outline-none appearance-none cursor-pointer"
                    required
                  >
                    <option value="" disabled>Choose your college...</option>
                    {colleges.map(c => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <Button type="submit" className="w-full sm:w-auto px-8 h-14 bg-primary-strong text-white hover:bg-primary-hover rounded-lg font-medium text-base shrink-0">
                  Find rooms
                </Button>
              </form>
              
              <div className="text-sm font-medium text-text-muted flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-text-main font-bold">{verifiedCount}</span>{' '}
                {verifiedCount === 1 ? 'room' : 'rooms'} visited in person
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-muted shadow-2xl">
              {heroImage ? (
                <Image
                  src={cloudinaryUrl(heroImage, 1200)}
                  alt="A student room photographed by Aangan"
                  width={1200}
                  height={900}
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-8 text-center">
                  <p className="font-heading text-lg font-semibold text-text-main">
                    Photographs coming this week
                  </p>
                  <p className="text-sm text-text-muted">
                    We are visiting rooms across Kolhapur right now. Every photo on this site
                    will be one we took ourselves.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* QUICK LINKS / CHIPS */}
      <section className="mb-16 lg:mb-24">
        <div className="max-w-[var(--content-max)] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Search by College</h2>
            <div className="flex flex-wrap gap-2">
              {collegeChips.map(c => (
                <Link 
                  key={c.slug} 
                  href={`/search?college=${c.slug}`}
                  className="px-4 py-2 bg-light border border-border rounded-full text-sm font-medium text-text-main hover:border-primary-strong hover:text-primary-strong transition-colors"
                >
                  {c.shortName || c.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Popular Shortcuts</h2>
            <div className="flex flex-wrap gap-2">
              <Link href="/search?genderPreference=Female" className="px-4 py-2 bg-light border border-border rounded-full text-sm font-medium text-text-main hover:border-primary-strong hover:text-primary-strong transition-colors">
                Girls PG
              </Link>
              <Link href="/search?genderPreference=Male" className="px-4 py-2 bg-light border border-border rounded-full text-sm font-medium text-text-main hover:border-primary-strong hover:text-primary-strong transition-colors">
                Boys PG
              </Link>
              <Link href="/search?food=yes" className="px-4 py-2 bg-light border border-border rounded-full text-sm font-medium text-text-main hover:border-primary-strong hover:text-primary-strong transition-colors">
                With mess
              </Link>
              <Link href="/search?maxPrice=6000" className="px-4 py-2 bg-light border border-border rounded-full text-sm font-medium text-text-main hover:border-primary-strong hover:text-primary-strong transition-colors">
                Under ₹6,000
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* RECENTLY ADDED */}
      {recentRooms.length > 0 && (
        <section className="mb-16 lg:mb-24">
          <div className="max-w-[var(--content-max)] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-text-main font-heading">Recently added</h2>
              <Link href="/search" className="text-primary-strong font-medium hover:underline">View all →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentRooms.map(room => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOW THIS WORKS */}
      <section className="mb-16 lg:mb-24 bg-light py-16 lg:py-24 border-y border-border">
        <div className="max-w-[var(--content-max)] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-12 text-text-main font-heading text-center">How this works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
            
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-4">
              <div className="w-12 h-12 bg-primary-strong/10 text-primary-strong flex items-center justify-center rounded-full text-xl font-bold">1</div>
              <h3 className="font-semibold text-text-main text-lg">We go to the room</h3>
              <p className="text-text-muted text-sm leading-relaxed">No fake listings. We physically visit every PG and room before it goes on Aangan.</p>
            </div>

            <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-4">
              <div className="w-12 h-12 bg-primary-strong/10 text-primary-strong flex items-center justify-center rounded-full text-xl font-bold">2</div>
              <h3 className="font-semibold text-text-main text-lg">We take the photos</h3>
              <p className="text-text-muted text-sm leading-relaxed">Including the bathroom. No wide-angle tricks, just honest photos of where you&apos;ll live.</p>
            </div>

            <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-4">
              <div className="w-12 h-12 bg-primary-strong/10 text-primary-strong flex items-center justify-center rounded-full text-xl font-bold">3</div>
              <h3 className="font-semibold text-text-main text-lg">You call the owner</h3>
              <p className="text-text-muted text-sm leading-relaxed">We give you the owner&apos;s direct mobile number. No middlemen blocking the conversation.</p>
            </div>

            <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-4">
              <div className="w-12 h-12 bg-primary-strong/10 text-primary-strong flex items-center justify-center rounded-full text-xl font-bold">4</div>
              <h3 className="font-semibold text-text-main text-lg">You pay us nothing</h3>
              <p className="text-text-muted text-sm leading-relaxed">Zero brokerage. Zero hidden fees. You only pay rent directly to your PG owner.</p>
            </div>

          </div>
        </div>
      </section>

      {/* OWNER CTA */}
      <section className="mb-16 lg:mb-24">
        <div className="max-w-[var(--content-max)] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-text-main text-white rounded-2xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
            <div className="space-y-4 max-w-xl text-center md:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold font-heading">Are you a PG owner?</h2>
              <p className="text-slate-300 text-lg">
                List your property on Aangan to get verified leads directly on your WhatsApp.
              </p>
            </div>
            <Button className="shrink-0 bg-white text-text-main hover:bg-slate-100 h-14 px-8 text-base font-medium border-none shadow-sm" render={<Link href="/list-your-pg" />} nativeButton={false}>
              List your PG
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
