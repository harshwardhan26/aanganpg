import Link from "next/link";
import prisma from "@/lib/prisma";
import { attendanceDay, recentDays, dayKey, dayLabel, attendanceSummary, MEAL_WINDOWS } from "@/lib/mess";

export const metadata = { title: "Today" };

const STRIP_DAYS = 14;

export default async function MessDashboard({
  params,
}: {
  params: Promise<{ messId: string }>;
}) {
  const { messId } = await params;

  const now = new Date();
  const today = attendanceDay(now);
  const days = recentDays(now, STRIP_DAYS);

  const [activeCount, rows, todayByMeal] = await Promise.all([
    prisma.student.count({ where: { messId, leftAt: null } }),
    // One grouped query for the whole strip rather than fourteen counts. The
    // student join is what keeps another mess's attendance out of this count.
    prisma.attendance.groupBy({
      by: ["day"],
      where: { student: { messId }, day: { gte: days[0] } },
      _count: { _all: true },
    }),
    prisma.attendance.groupBy({
      by: ["meal"],
      where: { student: { messId }, day: today },
      _count: { _all: true },
    }),
  ]);

  const byDay = new Map(rows.map((r) => [dayKey(r.day), r._count._all]));
  const byMeal = new Map(todayByMeal.map((r) => [r.meal, r._count._all]));
  // The headline number is the busiest meal today, not the sum: three meals from
  // one student is one student fed, and a "200 present" that means 70 people
  // eating twice is a number the owner would act on wrongly.
  const busiestMealToday = Math.max(0, ...MEAL_WINDOWS.map((w) => byMeal.get(w.meal) ?? 0));
  const summary = attendanceSummary(busiestMealToday, activeCount);
  const busiest = Math.max(1, ...days.map((d) => byDay.get(dayKey(d)) ?? 0));

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-3 gap-3">
        {MEAL_WINDOWS.map((window) => (
          <Stat
            key={window.meal}
            label={window.label}
            value={byMeal.get(window.meal) ?? 0}
            tone="strong"
          />
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Stat label="Busiest meal today" value={summary.present} />
        <Stat label="On the rolls" value={activeCount} />
      </section>

      <section className="rounded-xl border border-border bg-white p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-heading text-base font-semibold text-text-main">
            Meals served, last {STRIP_DAYS} days
          </h2>
          <span className="text-xs text-text-muted">{summary.percent}% in at the busiest meal</span>
        </div>

        <ol className="flex items-end gap-1.5 overflow-x-auto pb-1">
          {days.map((day) => {
            const count = byDay.get(dayKey(day)) ?? 0;
            const isToday = dayKey(day) === dayKey(today);
            return (
              <li key={dayKey(day)} className="flex min-w-9 flex-1 flex-col items-center gap-1.5">
                <span className="text-xs font-medium tabular-nums text-text-muted">{count}</span>
                <div
                  className={
                    isToday
                      ? "w-full rounded-t bg-primary-strong"
                      : "w-full rounded-t bg-primary-strong/35"
                  }
                  // Bars are data, so the height is data too. Floor at 4px so a
                  // zero-attendance day is still a visible tick rather than a gap
                  // the eye reads as missing.
                  style={{ height: `${Math.max(4, Math.round((count / busiest) * 96))}px` }}
                />
                <span className="whitespace-nowrap text-[10px] text-text-muted">{dayLabel(day)}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/mess/${messId}/checkin`}
          className="flex-1 rounded-xl bg-primary-strong px-4 py-3 text-center font-medium text-white hover:bg-primary-hover"
        >
          Mark attendance
        </Link>
        <Link
          href={`/mess/${messId}/students`}
          className="flex-1 rounded-xl border border-border bg-white px-4 py-3 text-center font-medium text-text-main hover:bg-muted"
        >
          Manage students
        </Link>
        <Link
          href={`/mess/${messId}/poster`}
          className="flex-1 rounded-xl border border-border bg-white px-4 py-3 text-center font-medium text-text-main hover:bg-muted"
        >
          Entry poster
        </Link>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "strong" }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p
        className={
          tone === "strong"
            ? "font-heading text-2xl font-bold tabular-nums text-primary-strong"
            : "font-heading text-2xl font-bold tabular-nums text-text-main"
        }
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-text-muted">{label}</p>
    </div>
  );
}
