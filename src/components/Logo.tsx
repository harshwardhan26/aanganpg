import * as React from "react";

export function Logo({
  className,
  height = 24,
}: {
  className?: string;
  height?: number;
}) {
  return (
    <div
      className={`flex items-center gap-1 ${className || ""}`}
      style={{ height: `${height}px` }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ height: "100%", width: "auto" }}
        className="text-inherit"
      >
        <path d="M4 14L12 6L20 14" />
        <circle cx="12" cy="16" r="2" fill="currentColor" stroke="none" />
      </svg>
      <span
        className="font-heading font-extrabold tracking-tight text-inherit"
        style={{ fontSize: `${height * 0.8}px`, lineHeight: 1 }}
      >
        aangan
      </span>
    </div>
  );
}
