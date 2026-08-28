import Image from "next/image";
import Link from "next/link";
import { cloudinaryUrl } from "@/lib/image";
import { cn } from "@/lib/utils";
import { SaveButton } from "./SaveButton";

type RoomCardProps = {
  room: {
    id: string;
    slug: string;
    title: string;
    price: number | null;
    displayPrice: string | null;
    location: string | null;
    imageUrl: string | null;
    occupancyType: string | null;
    genderPreference: string | null;
    foodType: string | null;
    deposit: number | null;
    vacantBeds: number | null;
    verifiedAt: Date | null;
    walkMinutes: number | null;
    college: {
      shortName: string | null;
      name: string;
    } | null;
    ratingAvg: number | null;
    ratingCount: number;
  };
};

export function RoomCard({ room }: RoomCardProps) {
  const isFull = room.vacantBeds === 0;
  
  const reviewCount = room.ratingCount;
  const reviewAvg = room.ratingAvg ?? 0;

  return (
    <div
      className={cn(
        "group relative flex flex-col border border-border rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow",
        isFull && "opacity-75"
      )}
    >
      {/* The whole card is the link, but as an overlay rather than a wrapper —
          the save button is a <button>, and a button inside an <a> is invalid
          markup that screen readers and browsers each resolve differently.
          z-10 so the overlay sits above the image box, which is positioned and
          later in the DOM; the save button sits above the overlay at z-20. */}
      <Link href={`/pg/${room.slug}`} className="absolute inset-0 z-10">
        <span className="sr-only">{room.title}</span>
      </Link>

      {/* 4:3 aspect box reserved before load */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden shrink-0">
        {room.imageUrl ? (
          <Image
            src={cloudinaryUrl(room.imageUrl, 600)}
            alt={room.title}
            width={600}
            height={450}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-600">
            No photo
          </div>
        )}
        
        {room.verifiedAt && (
          <div className="absolute top-3 left-3 bg-slate-800 text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-sm">
            Aangan visited
          </div>
        )}
        
        {isFull && (
          <div className="absolute top-12 left-3 bg-red-100 text-red-800 border border-red-200 text-xs font-medium px-2.5 py-1 rounded-full shadow-sm z-10">
            Full right now
          </div>
        )}

        <div className="absolute top-3 right-3 z-20">
          <SaveButton propertyId={room.id} />
        </div>
      </div>
      
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-medium text-text-main line-clamp-2 leading-snug">{room.title}</h3>
          <span className="font-semibold text-lg whitespace-nowrap text-text-main text-right">
            {/* An explicit ternary, not `?.split(…) || fallback`: `?.` guards
                null and undefined only, and `"".split('/')` is `[""]` — a
                truthy array — so an empty displayPrice rendered a blank price
                instead of falling through to the numeric one. */}
            {room.displayPrice
              ? room.displayPrice.split('/').map((part, i) => (
                  <span key={i}>
                    {i === 0 ? part : <span className="text-xs font-normal text-text-muted block text-right">/{part}</span>}
                  </span>
                ))
              : room.price
                ? `₹${room.price.toLocaleString("en-IN")}/month`
                : "Price on request"}
          </span>
        </div>
        
        <div className="flex justify-between items-center -mt-1">
          {reviewCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 w-fit">
              <span className="text-amber-600">★</span> 
              <span>{reviewAvg.toFixed(1)} <span className="text-slate-500 font-normal">({reviewCount})</span></span>
            </div>
          )}
        </div>
        
        {(room.location || room.college) && (
          <p className="text-sm text-text-muted leading-relaxed">
            {[
              room.location,
              room.college ? (room.college.shortName || room.college.name) : null,
              room.walkMinutes ? `${room.walkMinutes} min walk` : null
            ].filter(Boolean).join(' · ')}
          </p>
        )}
        
        {/* Deposit belongs next to the rent, not two clicks away on the listing
            page. It is the number that decides whether a family can take the
            room at all, and shortlisting five rooms on rent alone means finding
            it out five times over.
            `!= null`, never a truthiness check: a ₹0 deposit is the strongest
            thing this card can say, and `deposit &&` would hide it. */}
        {room.deposit != null && (
          <p className="text-sm text-text-muted">
            Deposit{" "}
            <span className="font-medium text-text-main">
              {room.deposit === 0 ? "none" : `₹${room.deposit.toLocaleString("en-IN")}`}
            </span>
          </p>
        )}

        <div className="mt-auto pt-3 flex flex-wrap gap-2">
          {room.occupancyType && (
            <span className="bg-slate-50 text-slate-600 text-xs font-medium px-2 py-1 rounded border border-border">
              {room.occupancyType}
            </span>
          )}
          {room.genderPreference && (
            <span className="bg-slate-50 text-slate-600 text-xs font-medium px-2 py-1 rounded border border-border">
              {room.genderPreference === 'Any' ? 'Co-ed' : room.genderPreference}
            </span>
          )}
          {room.foodType && (
            <span className="bg-slate-50 text-slate-600 text-xs font-medium px-2 py-1 rounded border border-border">
              Mess
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
