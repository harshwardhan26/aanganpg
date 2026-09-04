"use client";

import { useActionState } from "react";
import { respondToFeedback, type OperationsResult } from "@/actions/mess-operations";

const initial: OperationsResult = { ok: true, message: "" };

export function ResponseForm({
  messId,
  feedbackId,
  existing,
}: {
  messId: string;
  feedbackId: string;
  existing: string | null;
}) {
  const [state, action, pending] = useActionState(respondToFeedback, initial);
  return (
    <form action={action} className="mt-4 rounded-xl bg-muted p-4">
      <input type="hidden" name="messId" value={messId} />
      <input type="hidden" name="feedbackId" value={feedbackId} />
      {state.message && (
        <p role="status" className="mb-3 text-sm font-medium text-green-900">
          {state.message}
        </p>
      )}
      {!state.ok && (
        <p role="alert" className="mb-3 text-sm text-red-900">
          {state.issues.join(" ")}
        </p>
      )}
      <label className="text-sm font-semibold text-text-main">
        Private response
        <textarea
          name="response"
          required
          defaultValue={existing ?? ""}
          rows={3}
          className="mt-1.5 w-full rounded-xl border-2 border-border bg-white p-3 text-base font-normal"
        />
      </label>
      <label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-semibold text-text-main">
        <input type="checkbox" name="resolved" value="true" className="h-5 w-5" /> Mark resolved
      </label>
      <input type="hidden" name="resolved" value="false" />
      <button
        disabled={pending}
        className="mt-3 min-h-11 rounded-xl bg-primary-strong px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save response"}
      </button>
    </form>
  );
}
