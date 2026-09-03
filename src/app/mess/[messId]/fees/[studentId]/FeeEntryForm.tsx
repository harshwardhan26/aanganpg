"use client";

import { useActionState } from "react";
import { recordFeeEntry, sendFeeReminder, type FinanceResult } from "@/actions/mess-finance";

const initial: FinanceResult = { ok: true, message: "" };

export function FeeEntryForm({ messId, studentId, month, balance }: { messId: string; studentId: string; month: string; balance: number }) {
  const [state, action, pending] = useActionState(recordFeeEntry, initial);
  return (
    <form action={action} className="rounded-2xl border-2 border-border bg-white p-5">
      <input type="hidden" name="messId" value={messId} />
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="month" value={`${month}-01`} />
      <h2 className="font-heading text-xl font-bold text-text-main">Add ledger entry</h2>
      <p className="mt-1 text-sm text-text-muted">Record money received or an owner-approved adjustment. Existing entries are never overwritten.</p>
      {state.message && <p role="status" className="mt-3 rounded-xl bg-green-100 px-4 py-3 text-sm font-medium text-green-900">{state.message}</p>}
      {!state.ok && <div role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">{state.issues.join(" ")}</div>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-main">Entry type
          <select name="kind" defaultValue="PAYMENT" className="min-h-12 rounded-xl border-2 border-border bg-white px-3 text-base font-normal">
            <option value="PAYMENT">Payment received</option>
            <option value="DISCOUNT">Discount</option>
            <option value="EXTRA_CHARGE">Extra charge</option>
            <option value="REFUND">Refund returned</option>
            <option value="CREDIT">Existing credit used</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-main">Amount
          <input name="amount" inputMode="numeric" required defaultValue={balance > 0 ? balance : ""} className="min-h-12 rounded-xl border-2 border-border px-3 text-base font-normal" placeholder="2500" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-main">Payment method
          <select name="method" defaultValue="UPI" className="min-h-12 rounded-xl border-2 border-border bg-white px-3 text-base font-normal">
            <option value="UPI">UPI</option><option value="CASH">Cash</option><option value="BANK">Bank transfer</option><option value="OTHER">Other</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-main">UPI or bank reference
          <input name="externalReference" className="min-h-12 rounded-xl border-2 border-border px-3 text-base font-normal uppercase" placeholder="Required for UPI" />
        </label>
      </div>
      <label className="mt-4 flex flex-col gap-1.5 text-sm font-semibold text-text-main">Note
        <input name="note" className="min-h-12 rounded-xl border-2 border-border px-3 text-base font-normal" placeholder="Optional explanation" />
      </label>
      <button disabled={pending} className="mt-5 min-h-12 w-full rounded-xl bg-primary-strong px-5 text-base font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : "Save entry"}</button>
    </form>
  );
}

export function ReminderForm({ messId, paymentId }: { messId: string; paymentId: string }) {
  const [state, action, pending] = useActionState(sendFeeReminder, initial);
  return (
    <form action={action} className="rounded-2xl border-2 border-border bg-white p-5">
      <input type="hidden" name="messId" value={messId} />
      <input type="hidden" name="paymentId" value={paymentId} />
      <h2 className="font-heading text-lg font-bold text-text-main">Fee reminder</h2>
      <p className="mt-1 text-sm text-text-muted">Send the registered SMS template to the parent number.</p>
      {state.message && <p role="status" className="mt-3 text-sm font-medium text-green-900">{state.message}</p>}
      {!state.ok && <p role="alert" className="mt-3 text-sm text-red-900">{state.issues.join(" ")}</p>}
      <button disabled={pending} className="mt-4 min-h-12 rounded-xl border-2 border-primary-strong px-5 text-base font-semibold text-primary-strong disabled:opacity-60">{pending ? "Sending…" : "Send SMS reminder"}</button>
    </form>
  );
}
