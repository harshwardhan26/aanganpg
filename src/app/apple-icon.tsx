import { ImageResponse } from "next/og";

/**
 * iOS home screen. Same mark as `icon.tsx`, at the size Apple asks for and with
 * no transparency — iOS composites onto black otherwise, and a white roof on
 * black is not the logo.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#cc4040",
        }}
      >
        <svg
          width="108"
          height="108"
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
