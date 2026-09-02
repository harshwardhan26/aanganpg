import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { findStudent } from "@/actions/mess";
import {
  startOfIstMonth,
  monthLabel,
  dayKey,
  dayLabel,
  plural,
  MEAL_WINDOWS,
} from "@/lib/mess";

export const metadata = { title: "My attendance" };

/**
 * The answer to "how many days did I eat", without asking the owner.
 *
 * This is the screen that settles a dispute before it becomes one — the student
 * can see their own record, so a disagreement starts from the same list the
 * owner is looking at rather than from two memories.
 */
export default async function HistoryPage({
  params,
}: {
  params: Promise<{ messId: string }>;
}) {
  const { messId } = await params;

  const student = await findStudent(messId);
  if (!student) redirect("/my-mess");

  const month = startOfIstMonth(new Date());

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

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Link
        href={`/my-mess/${messId}`}
        className="inline-flex min-h-12 items-center text-base font-medium text-primary-strong underline underline-offset-4"
      >
        ← Back
      </Link>

      <h1 className="mt-2 font-heading text-3xl font-bold text-text-main">{monthLabel(month)}</h1>
      <p className="text-base text-text-muted">
        You ate <span className="font-bold text-text-main">{plural(rows.length, "meal")}</span> on{" "}
        {plural(days.length, "day")}
      </p>

      {days.length === 0 ? (
        <p className="mt-4 rounded-2xl border-2 border-border bg-white p-8 text-center text-base text-text-muted">
          You have not eaten this month yet.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {days.map(({ day, meals }) => (
            <li
              key={dayKey(day)}
              className="flex min-h-20 items-center justify-between gap-3 rounded-2xl border-2 border-border bg-white p-4"
            >
              <span className="text-lg font-semibold text-text-main">{dayLabel(day)}</span>
              <span className="flex gap-1.5">
                {MEAL_WINDOWS.map((window) => (
                  <span
                    key={window.meal}
                    title={window.label}
                    className={
                      meals.has(window.meal)
                        ? "flex h-10 w-10 items-center justify-center rounded-full bg-primary-strong text-base font-bold text-white"
                        : "flex h-10 w-10 items-center justify-center rounded-full bg-muted text-base text-text-muted"
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
