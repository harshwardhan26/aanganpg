import { getCachedRooms, getCachedColleges } from '@/lib/room-cache';
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
    getCachedColleges(),
    getCachedRooms({
      college: searchParams.college as string,
      genderPreference: searchParams.genderPreference as string,
      maxPrice: searchParams.maxPrice ? parseInt(searchParams.maxPrice as string) : undefined,
      food: searchParams.food as 'yes' | 'no',
      occupancy: searchParams.occupancy as string,
      amenities: typeof searchParams.amenities === 'string' ? [searchParams.amenities] : searchParams.amenities,
      rules: typeof searchParams.rules === 'string' ? [searchParams.rules] : searchParams.rules,
      sort: searchParams.sort as string,
    })
  ]);

  let h1Text = 'Student rooms and PGs';
  const activeFilters: { label: string, key: string, value?: string }[] = [];

  if (searchParams.college) {
    const matchedCollege = colleges.find(c => c.slug === searchParams.college);
    if (matchedCollege) {
      h1Text = `Rooms near ${matchedCollege.shortName || matchedCollege.name}`;
    }
    activeFilters.push({ label: matchedCollege?.shortName || matchedCollege?.name || 'College', key: 'college' });
  }
  
  if (searchParams.maxPrice) activeFilters.push({ label: `Under ₹${searchParams.maxPrice}`, key: 'maxPrice' });
  if (searchParams.genderPreference) activeFilters.push({ label: searchParams.genderPreference as string === 'Any' ? 'Co-ed' : searchParams.genderPreference as string, key: 'genderPreference' });
  if (searchParams.food) activeFilters.push({ label: searchParams.food === 'yes' ? 'With Mess' : 'Without Mess', key: 'food' });
  if (searchParams.occupancy) activeFilters.push({ label: searchParams.occupancy as string, key: 'occupancy' });
  
  const amenities = typeof searchParams.amenities === 'string' ? [searchParams.amenities] : searchParams.amenities || [];
  amenities.forEach((a: string) => activeFilters.push({ label: a, key: 'amenities', value: a }));
  
  const rules = typeof searchParams.rules === 'string' ? [searchParams.rules] : searchParams.rules || [];
  rules.forEach((r: string) => activeFilters.push({ label: r, key: 'rules', value: r }));

  return (
    <main className="min-h-screen bg-light">
      <div className="max-w-[var(--content-max)] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-start gap-8">
        
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 shrink-0 border-r border-border pr-8 lg:sticky lg:top-24 h-[calc(100vh-6rem)]">
          <SearchFilters searchParams={searchParams} colleges={colleges} />
        </aside>

        {/* Main Content */}
        <div className="flex-1 pb-24 lg:pb-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-main font-heading">{h1Text}</h1>
            <p className="text-text-muted mt-1">{rooms.length} {rooms.length === 1 ? 'room' : 'rooms'} found</p>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {activeFilters.map(f => {
                const newParams = new URLSearchParams();
                Object.entries(searchParams).forEach(([k, v]) => {
                  if (Array.isArray(v)) {
                    v.forEach(val => newParams.append(k, val));
                  } else if (v) {
                    newParams.append(k, v);
                  }
                });
                if (f.value) {
                  const existing = newParams.getAll(f.key);
                  newParams.delete(f.key);
                  existing.filter(e => e !== f.value).forEach(e => newParams.append(f.key, e));
                } else {
                  newParams.delete(f.key);
                }
                const href = `/search${newParams.toString() ? `?${newParams.toString()}` : ''}`;
                return (
                  <Link key={`${f.key}-${f.value || ''}`} href={href} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-border rounded-full text-xs font-medium text-text-main hover:bg-slate-50 transition-colors">
                    {f.label}
                    <span className="text-text-muted hover:text-red-500">×</span>
                  </Link>
                );
              })}
            </div>
          )}

          {rooms.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-6">
                {rooms.map(room => <RoomCard key={room.id} room={room} />)}
             </div>
          ) : (
             <div className="text-center py-16 px-4 bg-white rounded-xl border border-border">
               <h2 className="text-lg font-semibold text-text-main mb-2">No rooms match these exact filters</h2>
               <p className="text-text-muted mb-6">
                 Try widening your budget, dropping the mess filter, or checking a different locality.
               </p>
               <Button size="sm" className="border-border text-text-main hover:bg-muted bg-white border shadow-sm" render={<Link href="/search" />} nativeButton={false}>
                 Clear all filters
               </Button>
             </div>
          )}
        </div>

        {/* Mobile Filter Sheet */}
        <MobileFilterSheet>
          <SearchFilters searchParams={searchParams} colleges={colleges} />
        </MobileFilterSheet>

      </div>
    </main>
  );
}
