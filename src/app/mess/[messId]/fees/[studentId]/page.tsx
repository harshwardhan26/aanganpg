import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireMess } from "@/actions/mess";
import { attendanceDay, dueDate, monthKey, monthLabel, startOfIstMonth } from "@/lib/mess";
import { entryLabel, feeBalance, feeStatus, money } from "@/lib/mess-finance";
import { reverseFeeEntry } from "@/actions/mess-finance";
import { FeeEntryForm, ReminderForm } from "./FeeEntryForm";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata = { title: "Student fee ledger" };

export default async function StudentFeeLedger({ params, searchParams }: { params: Promise<{ messId: string; studentId: string }>; searchParams: Promise<{ month?: string }> }) {
  const { messId, studentId } = await params;
  const { role } = await requireMess(messId, "STAFF");
  if (role === "STAFF") redirect(`/mess/${messId}`);
  const rawMonth = (await searchParams).month;
  const month = rawMonth && /^\d{4}-\d{2}$/.test(rawMonth) ? new Date(`${rawMonth}-01T00:00:00.000Z`) : startOfIstMonth(new Date());
  const student = await prisma.student.findFirst({
    where: { id: studentId, messId },
    select: {
      id: true, name: true, monthlyFee: true, parentPhone: true,
      mess: { select: { dueDay: true } },
      payments: {
        where: { month },
        select: {
          id: true, amount: true, remindersSent: true,
          reminders: { orderBy: { createdAt: "desc" }, take: 5, select: { id: true, status: true, createdAt: true, error: true } },
          entries: { orderBy: { occurredAt: "desc" }, select: { id: true, kind: true, amount: true, method: true, receiptNumber: true, externalReference: true, note: true, occurredAt: true, reversedAt: true, reversalReason: true } },
        },
      },
    },
  });
  if (!student) notFound();
  const statement = student.payments[0] ?? null;
  const charge = statement?.amount ?? student.monthlyFee;
  const balance = feeBalance(charge, statement?.entries ?? []);
  const status = feeStatus({ charge, balance, due: dueDate(month, student.mess.dueDay), today: attendanceDay(new Date()), hasPayment: statement?.entries.some((entry) => entry.kind === "PAYMENT" && !entry.reversedAt) ?? false });
  const monthValue = monthKey(month);
  const whatsapp = balance > 0 ? whatsappLink(student.parentPhone, `${student.name}'s mess fee of ${money(balance)} for ${monthLabel(month)} is pending. Please pay at the mess.`) : null;

  return (
    <div className="flex flex-col gap-5">
      <Link href={`/mess/${messId}/fees?month=${monthValue}`} className="inline-flex min-h-11 items-center text-base font-semibold text-primary-strong">← Collections</Link>
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-text-muted">{monthLabel(month)}</p>
        <h1 className="font-heading text-3xl font-bold text-text-main">{student.name}</h1>
      </header>
      <section className="grid grid-cols-3 gap-3">
        <Stat label="Monthly fee" value={charge === null ? "Not set" : money(charge)} />
        <Stat label="Balance" value={money(balance)} />
        <Stat label="Status" value={status === "NOT_SET" ? "Missing" : status.toLowerCase().replace("_", " ")} />
      </section>

      <FeeEntryForm messId={messId} studentId={student.id} month={monthValue} balance={Math.max(0, balance)} />
      {statement && balance > 0 && <ReminderForm messId={messId} paymentId={statement.id} />}
      {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center rounded-xl bg-[#25d366] px-5 text-base font-semibold text-[#05391a]">Open WhatsApp reminder</a>}

      <section>
        <h2 className="font-heading text-xl font-bold text-text-main">Ledger history</h2>
        {!statement?.entries.length ? <p className="mt-3 rounded-2xl border-2 border-border bg-white p-6 text-text-muted">No entries yet.</p> : (
          <ul className="mt-3 flex flex-col gap-3">
            {statement.entries.map((entry) => (
              <li key={entry.id} className="rounded-2xl border-2 border-border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-semibold text-text-main">{entryLabel(entry.kind)} · {money(entry.amount)}</p><p className="mt-1 text-sm text-text-muted">{entry.occurredAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}{entry.method ? ` · ${entry.method}` : ""}{entry.externalReference ? ` · ${entry.externalReference}` : ""}</p>{entry.note && <p className="mt-2 text-sm text-text-muted">{entry.note}</p>}</div>
                  {entry.receiptNumber && !entry.reversedAt && <Link href={`/mess/${messId}/receipts/${entry.id}`} className="flex min-h-10 items-center rounded-lg bg-muted px-3 text-sm font-semibold text-text-main">Receipt</Link>}
                </div>
                {entry.reversedAt ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">Reversed · {entry.reversalReason}</p> : (
                  <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-red-800">Reverse this entry</summary><form action={reverseFeeEntry} className="mt-3 flex flex-col gap-2"><input type="hidden" name="messId" value={messId} /><input type="hidden" name="entryId" value={entry.id} /><label className="text-sm font-semibold text-text-main">Reason<input name="reason" required minLength={3} className="mt-1 min-h-11 w-full rounded-xl border-2 border-border px-3 text-base font-normal" /></label><button className="min-h-11 self-start rounded-xl border-2 border-red-800 px-4 text-sm font-semibold text-red-800">Confirm reversal</button></form></details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      {statement?.reminders.length ? <section><h2 className="font-heading text-xl font-bold text-text-main">Reminder history</h2><ul className="mt-3 flex flex-col gap-2">{statement.reminders.map((reminder) => <li key={reminder.id} className="rounded-xl bg-white p-4 text-sm text-text-main"><span className="font-semibold">{reminder.status}</span> · {reminder.createdAt.toLocaleString("en-IN")}{reminder.error ? ` · ${reminder.error}` : ""}</li>)}</ul></section> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border-2 border-border bg-white p-3"><p className="break-words font-heading text-lg font-bold text-text-main">{value}</p><p className="mt-1 text-xs text-text-muted">{label}</p></div>;
}
