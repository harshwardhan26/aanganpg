import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { findStudent } from "@/actions/mess";
import {
  attendanceDay,
  startOfIstMonth,
  monthLabel,
  dueDate,
  owesForMonth,
} from "@/lib/mess";
import { feeBalance, feeStatus as ledgerStatus, money } from "@/lib/mess-finance";

export const metadata = { title: "My payment" };

export default async function StudentPaymentPage({
  params,
}: {
  params: Promise<{ messId: string }>;
}) {
  const { messId } = await params;

  const student = await findStudent(messId);
  if (!student) redirect("/my-mess");

  const now = new Date();
  const month = startOfIstMonth(now);

  const [mess, payments] = await Promise.all([
    prisma.mess.findUnique({ where: { id: messId }, select: { name: true, dueDay: true } }),
    prisma.payment.findMany({
      where: { studentId: student.id },
      select: {
        id: true,
        month: true,
        amount: true,
        entries: {
          orderBy: { occurredAt: "desc" },
          select: { id: true, amount: true, receiptNumber: true, occurredAt: true, reversedAt: true, kind: true },
        },
      },
      orderBy: { month: "desc" },
      take: 12,
    }),
  ]);
  if (!mess) redirect("/my-mess");

  const due = dueDate(month, mess.dueDay);
  const thisMonth = payments.find((p) => p.month.getTime() === month.getTime()) ?? null;
  const owes = owesForMonth({
      joinedAt: student.joinedAt,
      leftAt: student.leftAt,
      monthlyFee: student.monthlyFee,
      due,
  });
  const balance = feeBalance(thisMonth?.amount ?? student.monthlyFee, thisMonth?.entries ?? []);
  const detailedState = ledgerStatus({ charge: thisMonth?.amount ?? student.monthlyFee, balance, due, today: attendanceDay(now), hasPayment: (thisMonth?.entries.length ?? 0) > 0 });
  const state = detailedState === "PAID" || detailedState === "CREDIT" ? "paid" : !owes ? "none" : detailedState === "OVERDUE" ? "overdue" : "due";
  // Red is reserved for actually late. Before the due date this is a reminder,
  // not a warning.
  const late = state === "overdue";
  const dueLabel = `${mess.dueDay} ${monthLabel(month).split(" ")[0]}`;

  return (
    <main className="mx-auto max-w-md px-4 pt-6 pb-10">
      <Link
        href={`/my-mess/${messId}`}
        className="inline-flex min-h-11 items-center gap-1 text-base font-medium text-primary-strong"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Back
      </Link>

      <h1 className="mt-2 font-heading text-3xl font-bold text-text-main">My fees</h1>

      <section
        className={
          late
            ? "rise mt-4 rounded-3xl border border-red-200 bg-red-50 p-6 shadow-[var(--shadow-soft)]"
            : "rise mt-4 rounded-3xl border border-border bg-white p-6 shadow-[var(--shadow-soft)]"
        }
      >
        <p className={late ? "text-base text-red-900" : "text-base text-text-muted"}>
          {monthLabel(month)}
        </p>
        <p
          className={
            late
              ? "font-heading text-4xl font-bold tabular-nums text-red-900"
              : "font-heading text-4xl font-bold tabular-nums text-text-main"
          }
        >
          {money(balance)}
        </p>
        <p className={late ? "mt-1 text-base text-red-900" : "mt-1 text-base text-text-muted"}>
          {state === "paid"
            ? balance < 0 ? `${money(balance)} credit on your account` : "Paid in full"
            : state === "overdue"
              ? `You had to pay by ${dueLabel}. Please pay at the mess.`
              : state === "due"
                ? `Pay by ${dueLabel} at the mess.`
                : "Nothing to pay."}
        </p>
      </section>

      {/*
        * Payment is recorded by the owner when he receives the money, so this is
        * a record, not a receipt the student can produce on their own. Said
        * plainly, because a student who thinks this page proves payment will
        * argue with it.
        */}
      <p className="mt-3 text-base text-text-muted">
        The mess marks this when they get your money.
      </p>

      {payments.length > 0 && (
        <section className="mt-6">
          <h2 className="font-heading text-xl font-bold text-text-main">Old months</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {payments
              .filter((p) => p.month.getTime() !== month.getTime())
              .map((p) => (
                <li
                  key={p.month.toISOString()}
                  className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 shadow-[var(--shadow-soft)]"
                >
                  <span className="text-lg font-semibold text-text-main">
                    {monthLabel(p.month)}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-base tabular-nums text-text-muted">
                      {money(feeBalance(p.amount, p.entries))}
                    </span>
                    <span
                      className={
                        feeBalance(p.amount, p.entries) <= 0
                          ? "rounded-full bg-green-100 px-3 py-1 text-base font-semibold text-green-900"
                          : "rounded-full bg-red-100 px-3 py-1 text-base font-semibold text-red-900"
                      }
                    >
                      {feeBalance(p.amount, p.entries) <= 0 ? "Paid" : "Due"}
                    </span>
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {payments.some((payment) => payment.entries.some((entry) => entry.receiptNumber && !entry.reversedAt)) && (
        <section className="mt-6">
          <h2 className="font-heading text-xl font-bold text-text-main">Receipts</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {payments.flatMap((payment) => payment.entries.filter((entry) => entry.receiptNumber).map((entry) => (
              <li key={entry.id}>
                <Link href={`/my-mess/${messId}/payment/${entry.id}`} className="flex min-h-14 items-center justify-between rounded-xl border border-border bg-white px-4 text-base font-semibold text-text-main">
                  <span>{entry.receiptNumber}</span><span className="text-text-muted">{money(entry.amount)} →</span>
                </Link>
              </li>
            ))) }
          </ul>
        </section>
      )}
    </main>
  );
}
