import { ImageResponse } from "next/og";

/**
 * The card every link to this site shows when it is forwarded.
 *
 * This product spreads on WhatsApp. A listing had a card only when it happened
 * to have a photo, and the home page, the search page and every college page had
 * none at all — so the most-forwarded links in the business arrived as a bare
 * blue line of text.
 *
 * Applies to every route that does not set its own; `/pg/[slug]` still overrides
 * this with the room's own photograph, which is the better card when there is
 * one. Drawn rather than stored for the same reason as the app icon: one
 * definition, no binary to fall out of step with the site.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Aangan — verified student rooms in Kolhapur, zero brokerage";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          // The same near-black the hero scrim lands on, so the card and the
          // page a reader arrives at look like one product.
          background: "linear-gradient(135deg, #8f2b2b 0%, #0f172a 100%)",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 14L12 6L20 14" />
            <circle cx="12" cy="16" r="2" fill="#ffffff" stroke="none" />
          </svg>
          <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: "-0.03em" }}>aangan</div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            marginTop: "36px",
          }}
        >
          Rooms that are actually verified.
        </div>

        <div style={{ display: "flex", fontSize: 34, marginTop: "28px", color: "rgba(255,255,255,0.9)" }}>
          Student Hostels, Rooms &amp; PGs in Kolhapur. Zero brokerage.
        </div>
      </div>
    ),
    { ...size },
  );
}
