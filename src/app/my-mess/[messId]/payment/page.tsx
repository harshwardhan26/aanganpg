import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { findStudent } from "@/actions/mess";
import {
  attendanceDay,
  startOfIstMonth,
  monthLabel,
  dueDate,
  owesForMonth,
  feeState,
} from "@/lib/mess";

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
      select: { month: true, amount: true, paidAt: true },
      orderBy: { month: "desc" },
      take: 12,
    }),
  ]);
  if (!mess) redirect("/my-mess");

  const due = dueDate(month, mess.dueDay);
  const thisMonth = payments.find((p) => p.month.getTime() === month.getTime()) ?? null;
  const state = feeState({
    today: attendanceDay(now),
    due,
    owes: owesForMonth({
      joinedAt: student.joinedAt,
      leftAt: student.leftAt,
      monthlyFee: student.monthlyFee,
      due,
    }),
    paid: thisMonth?.paidAt != null,
  });
  // Red is reserved for actually late. Before the due date this is a reminder,
  // not a warning.
  const late = state === "overdue";
  const dueLabel = `${mess.dueDay} ${monthLabel(month).split(" ")[0]}`;

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Link
        href={`/my-mess/${messId}`}
        className="inline-flex min-h-12 items-center text-base font-medium text-primary-strong underline underline-offset-4"
      >
        ← Back
      </Link>

      <h1 className="mt-2 font-heading text-3xl font-bold text-text-main">My fees</h1>

      <section
        className={
          late
            ? "mt-4 rounded-2xl border-2 border-red-800 bg-red-100 p-6"
            : "mt-4 rounded-2xl border-2 border-border bg-white p-6"
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
          ₹{(thisMonth?.amount ?? student.monthlyFee ?? 0).toLocaleString("en-IN")}
        </p>
        <p className={late ? "mt-1 text-base text-red-900" : "mt-1 text-base text-text-muted"}>
          {state === "paid"
            ? `Paid on ${thisMonth!.paidAt!.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
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
                  className="flex min-h-20 items-center justify-between gap-3 rounded-2xl border-2 border-border bg-white p-4"
                >
                  <span className="text-lg font-semibold text-text-main">
                    {monthLabel(p.month)}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-base tabular-nums text-text-muted">
                      ₹{(p.amount ?? 0).toLocaleString("en-IN")}
                    </span>
                    <span
                      className={
                        p.paidAt
                          ? "rounded-full bg-green-100 px-3 py-1 text-base font-semibold text-green-900"
                          : "rounded-full bg-red-100 px-3 py-1 text-base font-semibold text-red-900"
                      }
                    >
                      {p.paidAt ? "Paid" : "Not paid"}
                    </span>
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </main>
  );
}
