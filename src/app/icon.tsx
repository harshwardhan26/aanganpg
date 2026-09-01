import { ImageResponse } from "next/og";

/**
 * The app icon, generated rather than stored.
 *
 * `icon.png` used to be the navbar wordmark at 59x44 — not square, and a
 * fifteenth of the size the manifest claimed it was. A phone asked to install
 * the app got that image stretched to 512x512, and Chrome is entitled to refuse
 * the install prompt outright over it.
 *
 * The mark is the same roof-and-dot as `components/Logo`, drawn at whatever size
 * is asked for instead of resampled up from a thumbnail. Generating it keeps one
 * definition of the logo in the codebase; the alternative is a binary that
 * quietly stops matching the site.
 *
 * The glyph sits inside the middle 60% so a maskable icon can be cropped to a
 * circle — Android does exactly that — without clipping it.
 */
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // --primary-strong, not the lighter brand coral: this sits behind a
          // white mark and is the one that carries white at 4.80:1.
          background: "#cc4040",
        }}
      >
        <svg
          width="300"
          height="300"
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
      </div>
    ),
    { ...size },
  );
}
