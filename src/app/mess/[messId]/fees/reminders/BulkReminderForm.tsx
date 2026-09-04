"use client";

import { useActionState } from "react";
import { sendBulkFeeReminders, type FinanceResult } from "@/actions/mess-finance";

const initial: FinanceResult = { ok: true, message: "" };

export function BulkReminderForm({
  messId,
  month,
  students,
}: {
  messId: string;
  month: string;
  students: { id: string; name: string; amount: number; canSend: boolean }[];
}) {
  const [state, action, pending] = useActionState(sendBulkFeeReminders, initial);
  return (
    <form action={action}>
      <input type="hidden" name="messId" value={messId} />
      <input type="hidden" name="month" value={`${month}-01`} />
      {state.message && (
        <p
          role="status"
          className="mb-4 rounded-xl bg-green-100 p-4 text-sm font-medium text-green-900"
        >
          {state.message}
        </p>
      )}
      {!state.ok && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-900">
          {state.issues.join(" ")}
        </p>
      )}
      <fieldset>
        <legend className="sr-only">Students to remind</legend>
        <ul className="flex flex-col gap-3">
          {students.map((student) => (
            <li key={student.id}>
              <label className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-border bg-white p-4">
                <input
                  type="checkbox"
                  name="studentId"
                  value={student.id}
                  disabled={!student.canSend}
                  className="h-5 w-5"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-text-main">
                    {student.name}
                  </span>
                  <span className="block text-sm text-text-muted">
                    ₹{student.amount.toLocaleString("en-IN")} outstanding
                    {!student.canSend ? " · fee or phone missing" : ""}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <button
        disabled={pending || students.every((student) => !student.canSend)}
        className="sticky bottom-4 mt-5 min-h-14 w-full rounded-xl bg-primary-strong px-5 text-lg font-semibold text-white shadow-lg disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send selected SMS reminders"}
      </button>
    </form>
  );
}
