"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cloudinaryUrl } from "@/lib/image";

/**
 * The photographs are the product — they are the one thing no other listing
 * source in Kolhapur has — so all of them are shown, and the bathroom shot is
 * not buried at the end.
 */
export function RoomGallery({
  images,
  title,
}: {
  images: { id: string; url: string; tag: string | null }[];
  title: string;
}) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted text-text-muted sm:aspect-[16/9]">
        No photo yet
      </div>
    );
  }

  const current = images[index];
  const go = (delta: number) =>
    setIndex((i) => (i + delta + images.length) % images.length);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted sm:aspect-[16/9]">
        <Image
          src={cloudinaryUrl(current.url, 1200)}
          alt={current.tag ? `${title} — ${current.tag}` : title}
          fill
          // next/image with `fill` defaults to object-fit: fill, which stretches
          // every room photo.
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 900px"
          priority={index === 0}
        />

        {current.tag && (
          <span className="absolute bottom-3 left-3 rounded-full bg-dark/75 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur">
            {current.tag}
          </span>
        )}

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-text-main shadow-md"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-text-main shadow-md"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-dark/75 px-3 py-1 text-xs font-medium text-white">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-1 lg:px-0">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                i === index ? "border-primary-strong" : "border-transparent"
              }`}
            >
              <Image
                src={cloudinaryUrl(img.url, 160)}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
