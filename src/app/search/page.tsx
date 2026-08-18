import { getRooms, getColleges } from '@/actions/rooms';
import { RoomCard } from '@/components/RoomCard';
import { SearchFilters } from '@/components/SearchFilters';
import { MobileFilterSheet } from '@/components/MobileFilterSheet';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Rooms | Aangan',
  description: 'Find student rooms and PGs',
  alternates: { canonical: '/search' },
};

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SearchPage(props: PageProps) {
  const searchParams = await props.searchParams;

  const [colleges, rooms] = await Promise.all([
    getColleges(),
    getRooms({
      college: searchParams.college as string,
      genderPreference: searchParams.genderPreference as string,
      maxPrice: searchParams.maxPrice ? parseInt(searchParams.maxPrice as string) : undefined,
      food: searchParams.food as 'yes' | 'no',
      occupancy: searchParams.occupancy as string,
      amenities: typeof searchParams.amenities === 'string' ? [searchParams.amenities] : searchParams.amenities,
      rules: typeof searchParams.rules === 'string' ? [searchParams.rules] : searchParams.rules,
    })
  ]);

  let headingText = `${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'}`;
  
  if (searchParams.college) {
    const matchedCollege = colleges.find(c => c.slug === searchParams.college);
    if (matchedCollege) {
      headingText += ` near ${matchedCollege.shortName || matchedCollege.name}`;
    }
  }

  return (
    <main className="min-h-screen bg-light">
      <div className="max-w-[var(--content-max)] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-start gap-8">
        
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 shrink-0 border-r border-border pr-8 sticky top-8" style={{ height: 'calc(100vh - 4rem)' }}>
          <SearchFilters searchParams={searchParams} roomCount={rooms.length} colleges={colleges} />
        </aside>

        {/* Main Content */}
        <div className="flex-1 pb-24 lg:pb-8">
          <h1 className="text-xl font-bold mb-6 text-text-main">
            {headingText}
          </h1>

          {rooms.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-6">
                {rooms.map(room => <RoomCard key={room.id} room={room} />)}
             </div>
          ) : (
             <div className="text-center py-16 px-4 bg-white rounded-lg border border-border">
               <h2 className="text-lg font-semibold text-text-main mb-2">No rooms match these exact filters</h2>
               <p className="text-text-muted mb-6">
                 Try widening your budget, dropping the mess filter, or checking a different locality.
               </p>
               <Button className="border-border text-text-main hover:bg-muted bg-white border shadow-sm h-10" render={<Link href="/search" />} nativeButton={false}>
                 Clear all filters
               </Button>
             </div>
          )}
        </div>

        {/* Mobile Filter Sheet */}
        <MobileFilterSheet>
          <SearchFilters searchParams={searchParams} roomCount={rooms.length} colleges={colleges} />
        </MobileFilterSheet>

      </div>
    </main>
  );
}
