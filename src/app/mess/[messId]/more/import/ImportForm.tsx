"use client";

import { useActionState } from "react";
import { importStudents, type SettingsResult } from "@/actions/mess-settings";

const initial: SettingsResult = { ok: true, message: "" };

export function ImportForm({ messId }: { messId: string }) {
  const [state, action, pending] = useActionState(importStudents, initial);
  return <form action={action} className="mt-5 rounded-2xl border-2 border-border bg-white p-5"><input type="hidden" name="messId" value={messId} />{state.message && <p role="status" className="mb-4 rounded-xl bg-green-100 p-4 text-sm font-medium text-green-900">{state.message}</p>}{!state.ok && <div role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-900"><p className="font-semibold">Fix these rows:</p><ul className="mt-2 list-disc pl-5">{state.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}<label className="flex flex-col gap-2 text-sm font-semibold text-text-main">Student CSV<input type="file" name="file" accept=".csv,text/csv" required className="min-h-12 rounded-xl border-2 border-dashed border-border p-3 text-base font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:font-semibold" /></label><button disabled={pending} className="mt-5 min-h-12 w-full rounded-xl bg-primary-strong px-5 text-base font-semibold text-white disabled:opacity-60">{pending ? "Checking and importing…" : "Import students"}</button></form>;
}
