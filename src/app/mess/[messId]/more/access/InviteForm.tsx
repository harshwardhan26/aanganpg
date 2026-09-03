"use client";

import { useActionState } from "react";
import { inviteMessMember, type SettingsResult } from "@/actions/mess-settings";

const initial: SettingsResult = { ok: true, message: "" };

export function InviteForm({ messId }: { messId: string }) {
  const [state, action, pending] = useActionState(inviteMessMember, initial);
  return <form action={action} className="rounded-2xl border-2 border-border bg-white p-5"><input type="hidden" name="messId" value={messId} /><h2 className="font-heading text-xl font-bold text-text-main">Invite someone</h2>{state.message && <div role="status" className="mt-3 rounded-xl bg-green-100 p-4 text-sm text-green-900"><p>{state.message}</p>{state.inviteUrl && <p className="mt-2 break-all font-semibold">{state.inviteUrl}</p>}</div>}{!state.ok && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-4 text-sm text-red-900">{state.issues.join(" ")}</p>}<div className="mt-4 grid gap-4 sm:grid-cols-[1fr_10rem]"><label className="flex flex-col gap-1.5 text-sm font-semibold text-text-main">Google email<input type="email" name="email" required className="min-h-12 rounded-xl border-2 border-border px-3 text-base font-normal" /></label><label className="flex flex-col gap-1.5 text-sm font-semibold text-text-main">Role<select name="role" className="min-h-12 rounded-xl border-2 border-border bg-white px-3 text-base font-normal"><option value="STAFF">Helper</option><option value="OWNER">Owner</option></select></label></div><button disabled={pending} className="mt-5 min-h-12 rounded-xl bg-primary-strong px-5 text-base font-semibold text-white disabled:opacity-60">{pending ? "Creating invite…" : "Add or create invite"}</button></form>;
}
