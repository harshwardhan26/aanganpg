"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cloudinaryUrl } from "@/lib/image";

/**
 * The listings, pinned.
 *
 * Plain Leaflet in a `useEffect` rather than `react-leaflet`: that would be a
 * second dependency, coupled to the React version, to wrap a library used
 * imperatively in one place.
 *
 * Coordinates arrive already blurred for signed-out visitors — see
 * `approximateLocation` in `src/lib/geo.ts`. Nothing in this file knows or
 * cares which it got, which is the point: the exact numbers never reach the
 * browser unless the visitor is entitled to them.
 */

export type RoomPin = {
  id: string;
  slug: string;
  title: string;
  price: number | null;
  displayPrice: string | null;
  imageUrl: string | null;
  walkMinutes: number | null;
  lat: number;
  lng: number;
  collegeName: string | null;
};

/** The Kolhapur box from `looksLikeKolhapur`, so panning cannot lose the city. */
const CITY_BOUNDS = L.latLngBounds([16.4, 73.9], [17.0, 74.6]);

/** Short enough to fit in a pin: "₹5,000" becomes "5k". */
function pinLabel(pin: RoomPin) {
  if (pin.price == null) return "₹?";
  return pin.price >= 1000 ? `₹${Math.round(pin.price / 100) / 10}k` : `₹${pin.price}`;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export default function RoomMap({ pins }: { pins: RoomPin[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = L.map(container, {
      scrollWheelZoom: false, // Otherwise scrolling the page traps the cursor here.
      maxBounds: CITY_BOUNDS,
      maxBoundsViscosity: 0.7,
      minZoom: 11,
    });
    mapRef.current = map;

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      // Required by the OSM tile usage policy, and it is their data.
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const bounds =
      pins.length > 0
        ? L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]))
        : null;

    /**
     * `maxZoom` matters for the one-pin case: fitBounds on a single point
     * otherwise zooms to street level, which for a blurred pin implies a
     * precision that is not there.
     */
    const frame = () => {
      if (bounds) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 17 });
      else map.setView([16.705, 74.243], 13); // Kolhapur centre.
    };
    frame();

    /**
     * Leaflet measures its container once, at construction. If the box is not at
     * its final height yet — web fonts still loading, layout still settling — it
     * computes the wrong pixel size and `fitBounds` picks a zoom for a map that
     * does not exist. That is how nine pins inside a 2km box ended up as one
     * clump on a 5km view. Re-measure and re-frame whenever the box resizes.
     */
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
      frame();
    });
    observer.observe(container);

    for (const pin of pins) {
      const marker = L.marker([pin.lat, pin.lng], {
        // A price pill with a pointer, not Leaflet's default teardrop. Useful on
        // its own, and it sidesteps the default icon's CSS-relative PNG URL,
        // which does not survive Next's bundler.
        //
        // The wrapper stays 0x0 and the pill is absolutely positioned inside it
        // with its bottom-centre on the anchor, so the pointer tip marks the
        // exact spot and the pill sizes itself to whatever the price is. The
        // previous version let a flex child fill a zero-width wrapper, which
        // computes to zero width — every label was clipped to "₹".
        icon: L.divIcon({
          className: "",
          html: `<div style="position:absolute;left:0;bottom:0;transform:translateX(-50%);white-space:nowrap;line-height:0">
                   <div style="display:inline-block;line-height:1;border-radius:9999px;border:2px solid #fff;background:#cc4040;color:#fff;font-size:11px;font-weight:700;padding:5px 8px;box-shadow:0 1px 4px rgba(0,0,0,.35)">${escapeHtml(pinLabel(pin))}</div>
                   <div style="width:0;height:0;margin:-1px auto 0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #fff"></div>
                 </div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        title: pin.title,
        alt: pin.title,
        keyboard: true,
        // Nine pins inside a 2km box overlap. Raising the hovered one is the
        // built-in answer and costs nothing; clustering can wait until a screen
        // actually looks crowded.
        riseOnHover: true,
      }).addTo(map);

      const thumb = pin.imageUrl
        ? `<img src="${escapeHtml(cloudinaryUrl(pin.imageUrl, 160))}" alt="" width="64" height="64" style="width:64px;height:64px;object-fit:cover;border-radius:8px;flex-shrink:0" />`
        : "";
      const meta = [pin.collegeName, pin.walkMinutes ? `${pin.walkMinutes} min walk` : null]
        .filter(Boolean)
        .join(" · ");

      marker.bindPopup(
        `<a href="/pg/${escapeHtml(pin.slug)}" style="display:flex;gap:10px;align-items:center;text-decoration:none;color:inherit;min-width:200px">
           ${thumb}
           <span style="min-width:0">
             <strong style="display:block;font-size:14px;line-height:1.3">${escapeHtml(pin.title)}</strong>
             <span style="display:block;font-size:13px;margin-top:2px">${escapeHtml(pin.displayPrice || (pin.price ? `₹${pin.price.toLocaleString("en-IN")}/month` : "Price on request"))}</span>
             ${meta ? `<span style="display:block;font-size:12px;color:#475569;margin-top:2px">${escapeHtml(meta)}</span>` : ""}
           </span>
         </a>`,
        { closeButton: true, minWidth: 220 },
      );
    }

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [pins]);

  return (
    <div
      ref={containerRef}
      // A fixed height, because Leaflet measures its container on init and a
      // percentage height inside an auto-height parent computes to zero.
      className="h-[65vh] min-h-[380px] w-full overflow-hidden rounded-xl border border-border bg-slate-100 lg:h-[calc(100vh-12rem)]"
      role="region"
      aria-label={`Map of ${pins.length} ${pins.length === 1 ? "room" : "rooms"}. The list view has the same rooms as text.`}
    />
  );
}
