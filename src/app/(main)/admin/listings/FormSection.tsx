"use client";

import { ChevronDown, AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One foldable section of the listing form.
 *
 * A controlled `<details>` rather than a hand-rolled disclosure: the browser
 * already handles the keyboard, the ARIA and the animation, and `<summary>` is
 * focusable and announced without any of it being written here. The `open` prop
 * is controlled so that tapping a publish blocker can force its section open —
 * `onToggle` feeds the user's own taps back to the parent.
 *
 * The pattern matches `src/components/SearchFilters.tsx`, which uses the same
 * `marker:content-none` trick to drop the native triangle.
 */
export function FormSection({
  index,
  title,
  status,
  blocking,
  open,
  onToggle,
  children,
}: {
  index: number;
  title: string;
  /** Short right-aligned hint: "12 set", "4 of 6". Omit when there is nothing to say. */
  status?: string;
  /** True when this section holds something stopping publish. */
  blocking?: boolean;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <details
      open={open}
      onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)}
      className="overflow-hidden rounded-xl border border-border bg-white"
    >
      <summary
        className={cn(
          "flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 marker:content-none [&::-webkit-details-marker]:hidden",
          open && "border-b border-border",
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-text-muted">
          {index}
        </span>
        <span className="flex-1 font-heading font-bold text-text-main">{title}</span>

        {blocking ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-900">
            <AlertTriangle className="h-3.5 w-3.5" />
            Needed
          </span>
        ) : status ? (
          <span className="shrink-0 text-xs font-semibold text-text-muted">{status}</span>
        ) : (
          <Check className="h-4 w-4 shrink-0 text-green-800" aria-label="Nothing outstanding" />
        )}

        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-text-muted transition-transform", open && "rotate-180")}
        />
      </summary>
      <div className="space-y-4 p-4">{children}</div>
    </details>
  );
}
