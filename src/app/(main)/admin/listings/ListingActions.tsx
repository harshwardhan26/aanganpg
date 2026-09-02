"use client";

import { useState, useTransition } from "react";
import { markFull, markClosed, softDelete } from "@/actions/admin";
import { cn } from "@/lib/utils";

type Action = "full" | "closed" | "delete";

const COPY: Record<Action, { label: string; confirm: string; className: string }> = {
  full: {
    label: "Mark full",
    confirm: "Mark full?",
    className: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
  },
  closed: {
    label: "Close",
    confirm: "Close it?",
    className: "border-border bg-slate-50 text-text-main hover:bg-slate-100",
  },
  delete: {
    label: "Delete",
    confirm: "Delete it?",
    className: "border-red-200 bg-red-50 text-red-900 hover:bg-red-100",
  },
};

const RUN = { full: markFull, closed: markClosed, delete: softDelete };

/**
 * A two-tap destructive action.
 *
 * These used to be bare `<form action={fn.bind(null, id)}>` submits — one
 * accidental tap on a phone closed a listing, and Delete existed only in the
 * desktop table, so the mobile card could not undo what the table could do.
 *
 * The second tap is the confirm, rather than `window.confirm`: a native dialog
 * blocks the page and reads as an error the admin caused. Tapping anything else
 * cancels, because the armed state clears on blur.
 */
export function ListingActions({
  id,
  canMarkFull,
  canClose,
}: {
  id: string;
  canMarkFull: boolean;
  canClose: boolean;
}) {
  const [armed, setArmed] = useState<Action | null>(null);
  const [isPending, startTransition] = useTransition();

  const press = (action: Action) => {
    if (armed !== action) {
      setArmed(action);
      return;
    }
    setArmed(null);
    startTransition(async () => {
      await RUN[action](id);
    });
  };

  const actions: Action[] = [
    ...(canMarkFull ? (["full"] as Action[]) : []),
    ...(canClose ? (["closed"] as Action[]) : []),
    "delete",
  ];

  return (
    <>
      {actions.map((action) => {
        const isArmed = armed === action;
        return (
          <button
            key={action}
            type="button"
            disabled={isPending}
            onClick={() => press(action)}
            onBlur={() => isArmed && setArmed(null)}
            aria-label={isArmed ? `Confirm: ${COPY[action].label}` : COPY[action].label}
            className={cn(
              "min-h-11 flex-1 rounded-lg border px-3 text-sm font-medium transition-colors disabled:opacity-50",
              isArmed ? "border-primary-strong bg-primary-strong text-white" : COPY[action].className,
            )}
          >
            {isArmed ? COPY[action].confirm : COPY[action].label}
          </button>
        );
      })}
    </>
  );
}
