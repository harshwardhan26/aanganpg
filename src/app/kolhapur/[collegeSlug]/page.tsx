import { getColleges, getCollegeBySlug, getRoomsNearCollege } from '@/actions/rooms';
import { RoomCard } from '@/components/RoomCard';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

type PageProps = {
  params: Promise<{ collegeSlug: string }>;
};

export async function generateStaticParams() {
  const colleges = await getColleges();
  return colleges.map((college) => ({
    collegeSlug: college.slug,
  }));
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const college = await getCollegeBySlug(params.collegeSlug);
  
  if (!college) return {};

  const name = college.shortName || college.name;
  
  const keywords = [
    `room in Kolhapur`,
    `kolhapur madhe room`,
    `hostel near ${name}`,
    `hostel near ${college.name}`,
    `girls hostel Kolhapur`,
    `room for rent Kolhapur student`,
    `mess with room Kolhapur`,
    ...(college.aliases || [])
  ].filter(Boolean);

  return {
    title: `PG, hostel and rooms near ${name} | Aangan Kolhapur`,
    description: `Find verified PG, hostels, and rooms near ${college.name} in ${college.area}, Kolhapur. View photos, amenities and real rents.`,
    keywords: keywords.join(', '),
    alternates: {
      canonical: `/kolhapur/${college.slug}`,
    }
  };
}

export default async function CollegePage(props: PageProps) {
  const params = await props.params;
  const college = await getCollegeBySlug(params.collegeSlug);
  
  if (!college) {
    notFound();
  }

  const [allColleges, rooms] = await Promise.all([
    getColleges(),
    getRoomsNearCollege(college.slug)
  ]);

  const name = college.shortName || college.name;
  
  // Find nearest colleges (same area, or just next in list circularly)
  const sameAreaColleges = allColleges.filter(c => c.area === college.area && c.id !== college.id);
  const otherColleges = allColleges.filter(c => c.area !== college.area && c.id !== college.id);
  const nearestColleges = [...sameAreaColleges, ...otherColleges].slice(0, 2);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${siteUrl}/`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Kolhapur",
        "item": `${siteUrl}/kolhapur`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": `Rooms near ${name}`,
        "item": `${siteUrl}/kolhapur/${college.slug}`
      }
    ]
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": rooms.map((room, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `${siteUrl}/pg/${room.slug}`
    }))
  };

  return (
    <main className="min-h-screen bg-white pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      {rooms.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
        />
      )}

      {/* SINGLE-COLUMN HERO */}
      <section className="bg-light pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-border text-center px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-text-main leading-tight font-heading">
            PG, hostel and rooms near {name}
          </h1>
          <p className="text-lg text-text-muted">
            Find the best verified student accommodations in and around {college.area}, Kolhapur.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-6">
            <Link 
              href={`/search?college=${college.slug}&genderPreference=Female`}
              className="px-5 py-2.5 bg-pink-50 border border-pink-200 rounded-full text-sm font-medium text-pink-700 hover:bg-pink-100 transition-colors"
            >
              Girls PG
            </Link>
            <Link 
              href={`/search?college=${college.slug}&genderPreference=Male`}
              className="px-5 py-2.5 bg-blue-50 border border-blue-200 rounded-full text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
            >
              Boys PG
            </Link>
            <Link 
              href={`/search?college=${college.slug}&food=yes`}
              className="px-5 py-2.5 bg-amber-50 border border-amber-200 rounded-full text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
            >
              With Mess
            </Link>
            <Link 
              href={`/search?college=${college.slug}&maxPrice=6000`}
              className="px-5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-full text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              Under ₹6,000
            </Link>
          </div>
        </div>
      </section>

      {/* ROOMS LISTING */}
      <section className="max-w-[var(--content-max)] mx-auto px-4 sm:px-6 lg:px-8 mt-16 lg:mt-24">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-text-main font-heading">
            {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'} found
          </h2>
          <Link href="/search" className="text-primary-strong font-medium hover:underline flex items-center gap-1 text-sm sm:text-base">
            See all in Kolhapur <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {rooms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rooms.map(room => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-light rounded-2xl border border-border">
            <h2 className="text-lg font-semibold text-text-main mb-2">We haven&apos;t verified any rooms here yet</h2>
            <p className="text-text-muted mb-6">
              Our team is working on bringing trusted accommodations near {name}.
            </p>
            <Button size="sm" className="border-border text-text-main hover:bg-white bg-white border shadow-sm" render={<Link href="/search" />} nativeButton={false}>
              Search all Kolhapur rooms
            </Button>
          </div>
        )}
      </section>

      {/* SEO PROSE BLOCK */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-24 space-y-8 text-text-main">
        <div className="bg-light border border-border rounded-2xl p-6 sm:p-10 space-y-6">
          <h2 className="text-2xl font-bold font-heading">Living near {college.name}</h2>
          
          <div className="space-y-4 text-text-muted leading-relaxed">
            <p>
              Finding the right room in Kolhapur is crucial for your studies at {name}. Most students studying here prefer staying in <strong>{college.area}</strong> to minimize their daily commute and stay close to campus life.
            </p>
            <p>
              If you have a two-wheeler, you can easily broaden your search to nearby localities which might offer better rent rates or more spacious accommodations. It&apos;s very common for students to share a room to split costs.
            </p>
            <h3 className="text-lg font-semibold text-text-main pt-2">Typical Rent in this Area</h3>
            <p>
              Rent bands vary depending on the amenities. Typically, a basic single room or shared PG near {name} will cost around <strong>₹4,000 to ₹6,000 per month</strong> without mess. If you opt for an accommodation with meals included (mess), expect to pay between <strong>₹6,000 to ₹9,000 per month</strong>. Always verify if the rent includes utilities like electricity and water.
            </p>
          </div>
        </div>
      </section>

      {/* INTERNAL LINKS (NEAREST COLLEGES) */}
      {nearestColleges.length > 0 && (
        <section className="max-w-[var(--content-max)] mx-auto px-4 sm:px-6 lg:px-8 mt-24">
          <h2 className="text-lg font-bold text-text-main mb-6 uppercase tracking-wider text-center lg:text-left">
            Other colleges nearby
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            {nearestColleges.map(nc => (
              <Link 
                key={nc.slug}
                href={`/kolhapur/${nc.slug}`}
                className="flex-1 max-w-sm bg-white border border-border p-5 rounded-xl hover:shadow-md hover:border-primary-strong transition-all group"
              >
                <div className="font-semibold text-text-main group-hover:text-primary-strong">{nc.shortName || nc.name}</div>
                <div className="text-sm text-text-muted mt-1">{nc.area}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
