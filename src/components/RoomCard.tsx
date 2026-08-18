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
    price: number;
    imageUrl: string | null;
    occupancyType: string | null;
    genderPreference: string | null;
    foodType: string | null;
    vacantBeds: number | null;
    verifiedAt: Date | null;
    walkMinutes: number | null;
    college: {
      shortName: string | null;
      name: string;
    } | null;
  };
};

export function RoomCard({ room }: RoomCardProps) {
  const isFull = room.vacantBeds === 0;
  
  return (
    <Link 
      href={`/pg/${room.slug}`}
      className={cn(
        "group flex flex-col border border-border rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow",
        isFull && "opacity-60 grayscale-[0.5]"
      )}
    >
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
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            No photo
          </div>
        )}
        
        {room.verifiedAt && (
          <div className="absolute top-3 left-3 bg-slate-800 text-white text-xs font-medium px-2.5 py-1 rounded-md shadow-sm">
            Aangan visited
          </div>
        )}
        
        {isFull ? (
          <div className="absolute top-3 right-3 bg-red-100 text-red-800 border border-red-200 text-xs font-medium px-2 py-1 rounded-md shadow-sm z-10">
            Full right now
          </div>
        ) : (
          <div className="absolute top-3 right-3 z-10">
            <SaveButton propertyId={room.id} />
          </div>
        )}
      </div>
      
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium text-text-main line-clamp-2 leading-snug">{room.title}</h3>
          <span className="font-semibold text-lg whitespace-nowrap text-text-main mt-[-2px]">
            ₹{room.price.toLocaleString("en-IN")}
            <span className="text-xs font-normal text-text-muted block text-right">/month</span>
          </span>
        </div>
        
        {room.college && (
          <p className="text-sm text-text-muted">
            {room.college.shortName || room.college.name}
            {room.walkMinutes ? ` · ${room.walkMinutes} min walk` : ''}
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
    </Link>
  );
}
