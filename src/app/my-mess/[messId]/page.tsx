import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { findStudent } from "@/actions/mess";
import {
  attendanceDay,
  startOfIstMonth,
  monthLabel,
  dueDate,
  owesForMonth,
  menuFor,
  mealAt,
  MEAL_WINDOWS,
  MEAL_LABEL,
} from "@/lib/mess";

export const metadata = { title: "My mess" };

export default async function StudentMessPage({
  params,
}: {
  params: Promise<{ messId: string }>;
}) {
  const { messId } = await params;

  const found = await findStudent(messId);
  if (!found) redirect("/my-mess");

  const now = new Date();
  const day = attendanceDay(now);
  const month = startOfIstMonth(now);
  const servingNow = mealAt(now);

  const [mess, todayRows, monthCount, payment, menuRows] = await Promise.all([
    prisma.mess.findUnique({ where: { id: messId }, select: { name: true, dueDay: true } }),
    prisma.attendance.findMany({
      where: { studentId: found.id, day },
      select: { meal: true },
    }),
    prisma.attendance.count({ where: { studentId: found.id, day: { gte: month } } }),
    prisma.payment.findUnique({
      where: { studentId_month: { studentId: found.id, month } },
      select: { paidAt: true, amount: true },
    }),
    prisma.menuItem.findMany({
      where: { messId },
      select: { weekday: true, date: true, meal: true, items: true },
    }),
  ]);
  if (!mess) redirect("/my-mess");

  const markedMeals = new Set(todayRows.map((row) => row.meal));
  const due = dueDate(month, mess.dueDay);
  const owes =
    owesForMonth({
      joinedAt: found.joinedAt,
      leftAt: found.leftAt,
      monthlyFee: found.monthlyFee,
      due,
    }) && payment?.paidAt == null;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-8">
      <header>
        <p className="font-heading text-xs font-semibold tracking-wide text-text-muted uppercase">
          {mess.name}
        </p>
        <h1 className="font-heading text-2xl font-bold text-text-main">Hi, {found.name}</h1>
      </header>

      {/* Fees first when something is owed — it is the only thing on this page
          that needs the student to go and do something. */}
      {owes && (
        <section className="rounded-xl border border-red-700 bg-red-100 p-4">
          <p className="font-heading text-base font-semibold text-red-900">
            ₹{(payment?.amount ?? found.monthlyFee ?? 0).toLocaleString("en-IN")} due for{" "}
            {monthLabel(month)}
          </p>
          <p className="mt-1 text-sm text-red-900">
            Due on the {mess.dueDay}
            {mess.dueDay === 1 ? "st" : mess.dueDay === 2 ? "nd" : mess.dueDay === 3 ? "rd" : "th"}.
            Pay at the mess counter.
          </p>
        </section>
      )}

      <section className="rounded-xl border border-border bg-white p-4">
        <h2 className="font-heading text-base font-semibold text-text-main">Today&apos;s menu</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {MEAL_WINDOWS.map((window) => {
            const items = menuFor(menuRows, day, window.meal);
            const marked = markedMeals.has(window.meal);
            return (
              <li key={window.meal} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-text-main">{window.label}</span>
                  {marked ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-900">
                      Marked
                    </span>
                  ) : (
                    window.meal === servingNow && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-text-muted">
                        Serving now
                      </span>
                    )
                  )}
                </div>
                <p className="mt-0.5 text-sm text-text-muted">
                  {items ?? "Not put up yet"}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-white p-4">
        <h2 className="font-heading text-base font-semibold text-text-main">
          {monthLabel(month)}
        </h2>
        <p className="mt-1 font-heading text-3xl font-bold tabular-nums text-primary-strong">
          {monthCount}
        </p>
        <p className="text-sm text-text-muted">
          meals marked this month
          {markedMeals.size > 0 && ` · ${markedMeals.size} today`}
        </p>
        <Link
          href={`/my-mess/${messId}/history`}
          className="mt-3 inline-block text-sm text-primary-strong underline underline-offset-2"
        >
          See day by day
        </Link>
      </section>

      {/*
        * No "mark me present" button, deliberately. Marking has to require being
        * at the mess, and a button here would let anyone mark a meal from bed —
        * which would make the owner's headcount fiction. The poster at the door
        * stays the only way in.
        */}
      <section className="rounded-xl border border-dashed border-border p-4 text-center">
        <p className="text-sm text-text-muted">
          {servingNow && !markedMeals.has(servingNow)
            ? `Scan the poster at the mess to mark your ${MEAL_LABEL[servingNow].toLowerCase()}.`
            : "Scan the poster at the mess when you go to eat."}
        </p>
        {found.photoUrl && (
          <div className="relative mx-auto mt-3 h-16 w-16 overflow-hidden rounded-full border border-border">
            <Image src={found.photoUrl} alt="" fill sizes="64px" className="object-cover" />
          </div>
        )}
      </section>
    </main>
  );
}
