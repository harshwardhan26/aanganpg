"use client";

import { useActionState } from "react";
import { saveNotice, type OperationsResult } from "@/actions/mess-operations";

const initial: OperationsResult = { ok: true, message: "" };

export function NoticeForm({ messId }: { messId: string }) {
  const [state, action, pending] = useActionState(saveNotice, initial);
  return (
    <form action={action} className="rounded-2xl border-2 border-border bg-white p-5">
      <input type="hidden" name="messId" value={messId} />
      <h2 className="font-heading text-xl font-bold text-text-main">Publish an update</h2>
      {state.message && (
        <p role="status" className="mt-3 rounded-xl bg-green-100 p-3 text-sm text-green-900">
          {state.message}
        </p>
      )}
      {!state.ok && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-900">
          {state.issues.join(" ")}
        </p>
      )}
      <div className="mt-4 grid gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-main">
          Title
          <input
            name="title"
            required
            className="min-h-12 rounded-xl border-2 border-border px-3 text-base font-normal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-main">
          Message
          <textarea
            name="body"
            required
            rows={4}
            className="rounded-xl border-2 border-border p-3 text-base font-normal"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-main">
            Audience
            <select
              name="audience"
              className="min-h-12 rounded-xl border-2 border-border bg-white px-3 text-base font-normal"
            >
              <option value="ALL">Everyone</option>
              <option value="STUDENTS">Students</option>
              <option value="STAFF">Staff only</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-main">
            Show until
            <input
              type="date"
              name="expiresOn"
              className="min-h-12 rounded-xl border-2 border-border px-3 text-base font-normal"
            />
          </label>
        </div>
      </div>
      <button
        disabled={pending}
        className="mt-5 min-h-12 w-full rounded-xl bg-primary-strong px-5 text-base font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Publishing…" : "Publish notice"}
      </button>
    </form>
  );
}
