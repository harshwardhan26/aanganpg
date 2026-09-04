"use client";

import { useActionState } from "react";
import { setMealSkip, type OperationsResult } from "@/actions/mess-operations";

const initial: OperationsResult = { ok: true, message: "" };

export function SkipButton({
  messId,
  day,
  meal,
  skipped,
  disabled,
}: {
  messId: string;
  day: string;
  meal: "BREAKFAST" | "LUNCH" | "DINNER";
  skipped: boolean;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(setMealSkip, initial);
  return (
    <form action={action}>
      <input type="hidden" name="messId" value={messId} />
      <input type="hidden" name="day" value={day} />
      <input type="hidden" name="meal" value={meal} />
      <input type="hidden" name="skipped" value={skipped ? "false" : "true"} />
      <button
        disabled={disabled || pending}
        aria-pressed={skipped}
        className={
          skipped
            ? "min-h-11 rounded-xl border-2 border-primary-strong bg-primary-strong px-4 text-sm font-semibold text-white disabled:opacity-60"
            : "min-h-11 rounded-xl border-2 border-border bg-white px-4 text-sm font-semibold text-text-main disabled:bg-muted disabled:text-text-muted"
        }
      >
        {pending ? "Saving…" : disabled ? "Closed" : skipped ? "Skipped" : "I will skip"}
      </button>
      {!state.ok && (
        <p role="alert" className="mt-1 max-w-36 text-xs text-red-900">
          {state.issues.join(" ")}
        </p>
      )}
    </form>
  );
}
