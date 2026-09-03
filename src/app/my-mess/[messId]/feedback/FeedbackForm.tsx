"use client";

import { useActionState } from "react";
import { submitMessFeedback, type OperationsResult } from "@/actions/mess-operations";

const initial: OperationsResult = { ok: true, message: "" };

export function FeedbackForm({ messId }: { messId: string }) {
  const [state, action, pending] = useActionState(submitMessFeedback, initial);
  return <form action={action} className="rounded-2xl border-2 border-border bg-white p-5"><input type="hidden" name="messId" value={messId} />{state.message && <p role="status" className="mb-4 rounded-xl bg-green-100 p-4 text-sm font-medium text-green-900">{state.message}</p>}{!state.ok && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-900">{state.issues.join(" ")}</p>}<div className="grid gap-4"><label className="flex flex-col gap-1.5 text-sm font-semibold text-text-main">About<select name="category" className="min-h-12 rounded-xl border-2 border-border bg-white px-3 text-base font-normal"><option value="FOOD">Food</option><option value="CLEANLINESS">Cleanliness</option><option value="SERVICE">Service</option><option value="BILLING">Billing</option><option value="OTHER">Other</option></select></label><label className="flex flex-col gap-1.5 text-sm font-semibold text-text-main">Rating (optional)<select name="rating" defaultValue="" className="min-h-12 rounded-xl border-2 border-border bg-white px-3 text-base font-normal"><option value="">No rating</option><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Okay</option><option value="2">2 — Poor</option><option value="1">1 — Very poor</option></select></label><label className="flex flex-col gap-1.5 text-sm font-semibold text-text-main">Message<textarea name="message" required rows={5} className="rounded-xl border-2 border-border p-3 text-base font-normal" placeholder="Tell the owner what happened or what would help." /></label></div><button disabled={pending} className="mt-5 min-h-12 w-full rounded-xl bg-primary-strong px-5 text-base font-semibold text-white disabled:opacity-60">{pending ? "Sending…" : "Send privately"}</button></form>;
}
