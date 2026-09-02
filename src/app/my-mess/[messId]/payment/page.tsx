import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { findStudent } from "@/actions/mess";
import { startOfIstMonth, monthLabel, dueDate, owesForMonth } from "@/lib/mess";

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
  const owes =
    owesForMonth({
      joinedAt: student.joinedAt,
      leftAt: student.leftAt,
      monthlyFee: student.monthlyFee,
      due,
    }) && thisMonth?.paidAt == null;

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Link
        href={`/my-mess/${messId}`}
        className="text-sm text-primary-strong underline underline-offset-2"
      >
        ← Back
      </Link>

      <h1 className="mt-3 font-heading text-2xl font-bold text-text-main">My payment</h1>

      <section
        className={
          owes
            ? "mt-4 rounded-xl border border-red-700 bg-red-100 p-5"
            : "mt-4 rounded-xl border border-border bg-white p-5"
        }
      >
        <p className={owes ? "text-sm text-red-900" : "text-sm text-text-muted"}>
          {monthLabel(month)}
        </p>
        <p
          className={
            owes
              ? "font-heading text-3xl font-bold tabular-nums text-red-900"
              : "font-heading text-3xl font-bold tabular-nums text-text-main"
          }
        >
          ₹{(thisMonth?.amount ?? student.monthlyFee ?? 0).toLocaleString("en-IN")}
        </p>
        <p className={owes ? "mt-1 text-sm text-red-900" : "mt-1 text-sm text-text-muted"}>
          {thisMonth?.paidAt
            ? `Paid on ${thisMonth.paidAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
            : owes
              ? `Was due on the ${mess.dueDay}. Pay at the mess counter.`
              : `Due on the ${mess.dueDay} of this month.`}
        </p>
      </section>

      {/*
        * Payment is recorded by the owner when he receives the money, so this is
        * a record, not a receipt the student can produce on their own. Said
        * plainly, because a student who thinks this page proves payment will
        * argue with it.
        */}
      <p className="mt-3 text-xs text-text-muted">
        Updated by the mess when your payment is received.
      </p>

      {payments.length > 0 && (
        <section className="mt-6">
          <h2 className="font-heading text-base font-semibold text-text-main">Earlier months</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {payments
              .filter((p) => p.month.getTime() !== month.getTime())
              .map((p) => (
                <li
                  key={p.month.toISOString()}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-4"
                >
                  <span className="text-sm font-medium text-text-main">
                    {monthLabel(p.month)}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-sm tabular-nums text-text-muted">
                      ₹{(p.amount ?? 0).toLocaleString("en-IN")}
                    </span>
                    <span
                      className={
                        p.paidAt
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-900"
                          : "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-900"
                      }
                    >
                      {p.paidAt ? "Paid" : "Pending"}
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
