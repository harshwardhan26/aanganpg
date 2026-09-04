"use client";

import { useActionState } from "react";
import { saveMessSetup, type SettingsResult } from "@/actions/mess-settings";

const initial: SettingsResult = { ok: true, message: "" };

export function SetupForm({
  mess,
}: {
  mess: {
    id: string;
    name: string;
    address: string | null;
    contactPhone: string | null;
    dueDay: number;
    skipCutoff: string;
  };
}) {
  const [state, action, pending] = useActionState(saveMessSetup, initial);
  return (
    <form action={action} className="mt-5 rounded-2xl border-2 border-border bg-white p-5">
      <input type="hidden" name="messId" value={mess.id} />
      {state.message && (
        <p
          role="status"
          className="mb-4 rounded-xl bg-green-100 px-4 py-3 text-sm font-medium text-green-900"
        >
          {state.message}
        </p>
      )}
      {!state.ok && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">
          {state.issues.join(" ")}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mess name" name="name" defaultValue={mess.name} required />
        <Field
          label="Contact phone"
          name="contactPhone"
          defaultValue={mess.contactPhone ?? ""}
          inputMode="tel"
        />
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-main sm:col-span-2">
          Address
          <textarea
            name="address"
            defaultValue={mess.address ?? ""}
            rows={3}
            className="rounded-xl border-2 border-border p-3 text-base font-normal"
          />
        </label>
        <Field
          label="Monthly fee due day"
          name="dueDay"
          defaultValue={String(mess.dueDay)}
          inputMode="numeric"
          required
        />
        <Field
          label="Meal-skip cut-off"
          name="skipCutoff"
          defaultValue={mess.skipCutoff}
          type="time"
          required
        />
      </div>
      <button
        disabled={pending}
        className="mt-5 min-h-12 w-full rounded-xl bg-primary-strong px-5 text-base font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save setup"}
      </button>
    </form>
  );
}

function Field({
  label,
  ...props
}: {
  label: string;
  name: string;
  defaultValue: string;
  required?: boolean;
  inputMode?: "tel" | "numeric";
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-main">
      {label}
      <input
        {...props}
        className="min-h-12 rounded-xl border-2 border-border px-3 text-base font-normal"
      />
    </label>
  );
}
