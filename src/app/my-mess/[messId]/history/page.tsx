import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Flame } from "lucide-react";
import prisma from "@/lib/prisma";
import { findStudent } from "@/actions/mess";
import {
  attendanceDay,
  startOfIstMonth,
  monthLabel,
  dayKey,
  plural,
  DEFAULT_MEAL_WINDOWS,
} from "@/lib/mess";

export const metadata = { title: "My meals" };

/**
 * The answer to "how many days did I eat", without asking the owner.
 *
 * A month grid rather than a list: a student wants the shape of their month at
 * a glance — which days they missed, how it is going — and a list of dates only
 * gives that after reading every row. The list is still underneath for the days
 * they did eat, because "which meals on the 14th" is the question that settles
 * an argument.
 */
export default async function HistoryPage({ params }: { params: Promise<{ messId: string }> }) {
  const { messId } = await params;

  const student = await findStudent(messId);
  if (!student) redirect("/my-mess");

  const now = new Date();
  const month = startOfIstMonth(now);
  const today = attendanceDay(now);

  const rows = await prisma.attendance.findMany({
    where: { studentId: student.id, day: { gte: month } },
    select: { day: true, meal: true },
    orderBy: { day: "desc" },
  });

  // Grouped in one pass rather than a query per day.
  const byDay = new Map<string, { day: Date; meals: Set<string> }>();
  for (const row of rows) {
    const key = dayKey(row.day);
    const entry = byDay.get(key) ?? { day: row.day, meals: new Set<string>() };
    entry.meals.add(row.meal);
    byDay.set(key, entry);
  }

  const days = [...byDay.values()];
  const daysInMonth = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const todayNumber = today.getUTCDate();

  // Days running back from today with at least one meal. Stops at the first gap,
  // and never counts today as a break before the student has eaten.
  let streak = 0;
  for (let n = todayNumber; n >= 1; n--) {
    const key = dayKey(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), n)));
    if (byDay.has(key)) streak++;
    else if (n !== todayNumber) break;
  }

  return (
    <main className="mx-auto max-w-md px-4 pt-6 pb-10">
      <Link
        href={`/my-mess/${messId}`}
        className="inline-flex min-h-11 items-center gap-1 text-base font-medium text-primary-strong"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Back
      </Link>

      <h1 className="mt-1 font-heading text-2xl font-bold text-text-main">{monthLabel(month)}</h1>

      <section className="rise mt-4 grid grid-cols-3 gap-3">
        <Stat value={String(rows.length)} label={rows.length === 1 ? "meal" : "meals"} />
        <Stat value={String(days.length)} label={days.length === 1 ? "day" : "days"} />
        <Stat value={String(streak)} label="in a row" icon={streak >= 3} />
      </section>

      <section
        className="rise mt-4 rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-soft)]"
        style={{ "--rise-delay": "80ms" } as React.CSSProperties}
      >
        <ol className="grid grid-cols-7 gap-2">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((n) => {
            const key = dayKey(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), n)));
            const count = byDay.get(key)?.meals.size ?? 0;
            const future = n > todayNumber;
            const isToday = n === todayNumber;
            return (
              <li key={n}>
                <span
                  // The number stays readable at every fill level — this is the
                  // grid a student counts their own month on.
                  className={[
                    "flex aspect-square items-center justify-center rounded-xl text-sm font-semibold tabular-nums",
                    isToday ? "ring-2 ring-primary-strong ring-offset-2" : "",
                    future
                      ? "bg-slate-50 text-slate-400"
                      : count === 0
                        ? "bg-slate-100 text-text-muted"
                        : count === 1
                          ? "bg-red-100 text-red-900"
                          : count === 2
                            ? "bg-[#e8a0a0] text-red-900"
                            : "bg-primary-strong text-white",
                  ].join(" ")}
                  title={`${n}: ${plural(count, "meal")}`}
                >
                  {n}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-sm text-text-muted">
          Darker means more meals that day. Today has a ring.
        </p>
      </section>

      {days.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-border bg-white p-8 text-center text-base text-text-muted">
          You have not eaten this month yet.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {days.map(({ day, meals }, i) => (
            <li
              key={dayKey(day)}
              style={{ "--rise-delay": `${Math.min(i, 8) * 40 + 120}ms` } as React.CSSProperties}
              className="rise flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 shadow-[var(--shadow-soft)]"
            >
              <span className="text-base font-semibold text-text-main">
                {day.toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </span>
              <span className="flex gap-1.5">
                {DEFAULT_MEAL_WINDOWS.map((window) => (
                  <span
                    key={window.meal}
                    title={window.label}
                    className={
                      meals.has(window.meal)
                        ? "flex h-9 w-9 items-center justify-center rounded-full bg-primary-strong text-sm font-bold text-white"
                        : "flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm text-text-muted"
                    }
                  >
                    {window.label[0]}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Stat({ value, label, icon }: { value: string; label: string; icon?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
      <p className="flex items-center gap-1.5 font-heading text-3xl font-bold tabular-nums text-text-main">
        {value}
        {icon && <Flame className="h-5 w-5 text-primary-strong" aria-hidden />}
      </p>
      <p className="mt-0.5 text-sm text-text-muted">{label}</p>
    </div>
  );
}
