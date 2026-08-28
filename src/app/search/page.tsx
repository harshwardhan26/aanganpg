import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCachedRooms, getCachedColleges, getCachedRoomPins, getCachedRoomsWithoutPins } from '@/lib/room-cache';
import { approximateLocation } from '@/lib/geo';
import { RoomMapLoader } from '@/components/RoomMapLoader';
import { List, Map as MapIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseRoomFilters } from '@/lib/room-filters';
import { RoomCard } from '@/components/RoomCard';
import { SearchFilters } from '@/components/SearchFilters';
import { MobileFilterSheet } from '@/components/MobileFilterSheet';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Metadata } from 'next';

export async function generateMetadata(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const collegeSlug = searchParams.college as string;
  let title = 'Search rooms';

  if (collegeSlug) {
    const colleges = await getCachedColleges();
    const matchedCollege = colleges.find(c => c.slug === collegeSlug);
    if (matchedCollege) {
      title = `Rooms near ${matchedCollege.shortName || matchedCollege.name}`;
    }
  }

  return {
    title,
    description: 'Find student Hostels, Rooms & PGs',
    alternates: { canonical: '/search' },
  };
}

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SearchPage(props: PageProps) {
  const searchParams = await props.searchParams;

  const page = Math.max(1, Number(searchParams.page) || 1);
  const isMap = searchParams.view === 'map';
  const filters = parseRoomFilters(searchParams);

  const [colleges, result, session, pinRows, withoutPins] = await Promise.all([
    getCachedColleges(),
    getCachedRooms(filters, page),
    // Only the map needs to know who is looking, and only to decide whether the
    // pins are exact. The list view has never shown a coordinate.
    isMap ? getServerSession(authOptions) : Promise.resolve(null),
    isMap ? getCachedRoomPins(filters) : Promise.resolve([]),
    isMap ? getCachedRoomsWithoutPins(filters) : Promise.resolve(0),
  ]);
  const { rooms, hasMore } = result;

  /**
   * Blurred here, on the server, before the coordinates cross to the browser.
   * Doing it in the map component would leave the real numbers sitting in the
   * page payload for anyone who opened dev tools — the gate has to be applied
   * where the data is selected, not where it is drawn.
   */
  const signedIn = Boolean(session?.user);
  const pins = pinRows.map((r) => {
    const exact = { lat: r.lat as number, lng: r.lng as number };
    const shown = signedIn ? exact : approximateLocation(r.id, exact.lat, exact.lng);
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      price: r.price,
      displayPrice: r.displayPrice,
      imageUrl: r.imageUrl,
      walkMinutes: r.walkMinutes,
      lat: shown.lat,
      lng: shown.lng,
      collegeName: r.college?.shortName || r.college?.name || null,
    };
  });

  /** This URL with the view swapped, keeping every active filter. */
  const viewHref = (view: 'list' | 'map') => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (k === 'view' || k === 'page') return;
      if (Array.isArray(v)) v.forEach(val => params.append(k, val));
      else if (v) params.append(k, v);
    });
    if (view === 'map') params.set('view', 'map');
    return `/search${params.toString() ? `?${params.toString()}` : ''}`;
  };

  /** This URL with `page` swapped, so paging keeps every active filter. */
  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (k === 'page') return;
      if (Array.isArray(v)) v.forEach(val => params.append(k, val));
      else if (v) params.append(k, v);
    });
    if (n > 1) params.set('page', String(n));
    return `/search${params.toString() ? `?${params.toString()}` : ''}`;
  };

  let h1Text = 'Student Hostels, Rooms & PGs';
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
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-text-main font-heading">{h1Text}</h1>
              <p className="text-text-muted mt-1">
                {isMap ? (
                  <>{pins.length} {pins.length === 1 ? 'room' : 'rooms'} on the map</>
                ) : (
                  <>
                    {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
                    {hasMore || page > 1 ? ` on page ${page}` : ' found'}
                  </>
                )}
              </p>
            </div>

            {/* List | Map. Plain links, so the view lives in the URL alongside
                every filter and survives a reload or a shared link. */}
            <div className="flex gap-1 rounded-lg border border-border bg-white p-1">
              {([['list', 'List', List], ['map', 'Map', MapIcon]] as const).map(([value, label, Icon]) => {
                const active = isMap === (value === 'map');
                return (
                  <Link
                    key={value}
                    href={viewHref(value)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'inline-flex min-h-11 items-center gap-1.5 rounded-md px-4 text-sm font-medium transition-colors',
                      active ? 'bg-primary-strong text-white' : 'text-text-muted hover:bg-slate-50',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
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

          {isMap ? (
            <div className="space-y-3">
              <RoomMapLoader pins={pins} />
              {/* pb clears the fixed "Filters" button, which is anchored
                  bottom-right on mobile and otherwise sits on top of this line. */}
              <p className="pb-16 text-xs text-text-muted lg:pb-0">
                {signedIn
                  ? 'Pins show the exact location.'
                  : 'Pins are approximate. Sign in on a room to see its exact location and get directions.'}
                {withoutPins > 0 && (
                  <>
                    {' '}
                    {withoutPins} {withoutPins === 1 ? 'room has' : 'rooms have'} no location yet —{' '}
                    <Link href={viewHref('list')} className="text-primary-strong underline underline-offset-4">
                      see the list
                    </Link>
                    .
                  </>
                )}
              </p>
            </div>
          ) : rooms.length > 0 ? (
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

          {!isMap && (page > 1 || hasMore) && (
            <nav aria-label="Search results pages" className="mt-10 flex items-center justify-between gap-4">
              {page > 1 ? (
                <Button size="sm" className="border-border text-text-main hover:bg-muted bg-white border shadow-sm" render={<Link href={pageHref(page - 1)} rel="prev" />} nativeButton={false}>
                  ← Previous
                </Button>
              ) : <span />}

              <span className="text-sm text-text-muted">Page {page}</span>

              {hasMore ? (
                <Button size="sm" className="border-border text-text-main hover:bg-muted bg-white border shadow-sm" render={<Link href={pageHref(page + 1)} rel="next" />} nativeButton={false}>
                  Next →
                </Button>
              ) : <span />}
            </nav>
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
