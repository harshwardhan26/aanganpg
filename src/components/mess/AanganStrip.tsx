import { ArrowUpRight, BedDouble, MapPin, ShieldCheck, IndianRupee } from "lucide-react";
import { getBaseUrl } from "@/lib/url";

/**
 * The one place the mess site mentions the room site.
 *
 * A thin strip, not a section: this is an advert, and an advert that takes a
 * screenful on a page a student opened to check tonight's food would be worse
 * than no advert. It scrolls because a 40px bar that sits still is a bar nobody
 * reads.
 *
 * Deliberately the only crossing point. The two products share a deployment and
 * a database and neither is ever meant to show that — a link a student can
 * choose to follow is a different thing from a dependency.
 */
const PITCHES = [
  { Icon: BedDouble, text: "Hostels, Rooms & PGs in Kolhapur" },
  { Icon: ShieldCheck, text: "Every room visited and photographed" },
  { Icon: MapPin, text: "Near every college" },
  { Icon: IndianRupee, text: "Zero brokerage" },
];

export function AanganStrip() {
  return (
    <a
      href={getBaseUrl()}
      // Not `noopener` alone: this opens a sister site, and a student who taps
      // it should be able to come back with the browser's own back button.
      // `--primary-strong` (#cc4040), never the brand coral: #fa5a5a is 3.15:1
      // against white, and white text on it is the one thing the house rules
      // name outright.
      className="group block overflow-hidden bg-primary-strong py-2.5"
      aria-label="Looking for a room? Visit aanganpg.com — hostels, rooms and PGs in Kolhapur"
    >
      <div className="marquee" style={{ "--marquee-duration": "22s" } as React.CSSProperties}>
        {/* Twice, so the slide can loop on a seam nobody can see. The copy a
            screen reader would repeat is hidden from it. */}
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
            {PITCHES.map(({ Icon, text }) => (
              // The name follows every line. Whichever moment a student happens
              // to glance at the strip, the address is on screen — a pitch they
              // cannot act on is an advert that did nothing.
              <span key={text} className="flex shrink-0 items-center">
                <span className="flex shrink-0 items-center gap-2 pl-6 text-sm font-medium whitespace-nowrap text-white">
                  <Icon className="h-4 w-4 shrink-0 text-white/75" aria-hidden />
                  {text}
                </span>
                <span className="px-3 text-sm text-white/50" aria-hidden>
                  ·
                </span>
                <span className="flex shrink-0 items-center gap-1 pr-2 text-sm font-bold whitespace-nowrap text-white">
                  aanganpg.com
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </a>
  );
}
