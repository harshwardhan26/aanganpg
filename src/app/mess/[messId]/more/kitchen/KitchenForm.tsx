"use client";

import { useActionState } from "react";
import { saveKitchenLog, type OperationsResult } from "@/actions/mess-operations";

const initial: OperationsResult = { ok: true, message: "" };

export function KitchenForm({ messId, defaultDay }: { messId: string; defaultDay: string }) {
  const [state, action, pending] = useActionState(saveKitchenLog, initial);
  return <form action={action} className="rounded-2xl border-2 border-border bg-white p-5"><input type="hidden" name="messId" value={messId} /><h2 className="font-heading text-xl font-bold text-text-main">Record actual food</h2><p className="mt-1 text-sm text-text-muted">Save what was prepared and left over after service.</p>{state.message && <p role="status" className="mt-3 rounded-xl bg-green-100 p-3 text-sm text-green-900">{state.message}</p>}{!state.ok && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-900">{state.issues.join(" ")}</p>}<div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Date" name="day" type="date" defaultValue={defaultDay} /><label className="flex flex-col gap-1.5 text-sm font-semibold text-text-main">Meal<select name="meal" className="min-h-12 rounded-xl border-2 border-border bg-white px-3 text-base font-normal"><option value="BREAKFAST">Breakfast</option><option value="LUNCH">Lunch</option><option value="DINNER">Dinner</option></select></label><Field label="Prepared meals" name="preparedCount" inputMode="numeric" /><Field label="Leftover meals" name="leftoverCount" inputMode="numeric" defaultValue="0" /></div><label className="mt-4 flex flex-col gap-1.5 text-sm font-semibold text-text-main">Note<input name="note" className="min-h-12 rounded-xl border-2 border-border px-3 text-base font-normal" /></label><button disabled={pending} className="mt-5 min-h-12 w-full rounded-xl bg-primary-strong px-5 text-base font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : "Save kitchen numbers"}</button></form>;
}

function Field({ label, ...props }: { label: string; name: string; type?: string; inputMode?: "numeric"; defaultValue?: string }) { return <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-main">{label}<input required {...props} className="min-h-12 rounded-xl border-2 border-border px-3 text-base font-normal" /></label>; }
