import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { findStudent } from "@/actions/mess";
import { startOfIstMonth, monthLabel, dayKey, dayLabel, MEAL_WINDOWS } from "@/lib/mess";

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
        className="text-sm text-primary-strong underline underline-offset-2"
      >
        ← Back
      </Link>

      <h1 className="mt-3 font-heading text-2xl font-bold text-text-main">{monthLabel(month)}</h1>
      <p className="text-sm text-text-muted">
        <span className="font-semibold tabular-nums text-text-main">{rows.length}</span> meals over{" "}
        <span className="tabular-nums">{days.length}</span> days
      </p>

      {days.length === 0 ? (
        <p className="mt-4 rounded-xl border border-border bg-white p-6 text-center text-sm text-text-muted">
          Nothing marked this month yet.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {days.map(({ day, meals }) => (
            <li
              key={dayKey(day)}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-4"
            >
              <span className="font-medium text-text-main">{dayLabel(day)}</span>
              <span className="flex gap-1.5">
                {MEAL_WINDOWS.map((window) => (
                  <span
                    key={window.meal}
                    title={window.label}
                    className={
                      meals.has(window.meal)
                        ? "rounded-full bg-primary-strong px-2.5 py-1 text-xs font-medium text-white"
                        : "rounded-full bg-muted px-2.5 py-1 text-xs text-text-muted"
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
