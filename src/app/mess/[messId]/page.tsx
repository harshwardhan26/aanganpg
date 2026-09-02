import Link from "next/link";
import { ClipboardCheck, Users, QrCode } from "lucide-react";
import prisma from "@/lib/prisma";
import {
  attendanceDay,
  recentDays,
  dayKey,
  dayLabel,
  mealWindows,
  DEFAULT_MEAL_TIMES,
  MESS_TIMES_SELECT,
} from "@/lib/mess";

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

  const mess = await prisma.mess.findUnique({
    where: { id: messId },
    select: MESS_TIMES_SELECT,
  });
  const windows = mealWindows(mess ?? DEFAULT_MEAL_TIMES);

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
  const busiest = Math.max(1, ...days.map((d) => byDay.get(dayKey(d)) ?? 0));

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 font-heading text-xl font-bold text-text-main">Today</h2>
        <div className="grid grid-cols-3 gap-3">
          {windows.map((window) => (
            <div key={window.meal} className="rounded-2xl border-2 border-border bg-white p-4">
              <p className="font-heading text-4xl font-bold tabular-nums text-primary-strong">
                {byMeal.get(window.meal) ?? 0}
              </p>
              <p className="mt-1 text-base font-medium text-text-main">{window.label}</p>
              <p className="text-sm text-text-muted">came</p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-2xl border-2 border-border bg-white p-5">
          <p className="text-base text-text-main">
            <span className="font-heading text-2xl font-bold tabular-nums">{activeCount}</span>{" "}
            students in this mess
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-heading text-xl font-bold text-text-main">Last 14 days</h2>
        <div className="rounded-2xl border-2 border-border bg-white p-5">
          <ol className="flex items-end gap-2 overflow-x-auto pb-1">
            {days.map((day) => {
              const count = byDay.get(dayKey(day)) ?? 0;
              const isToday = dayKey(day) === dayKey(today);
              return (
                <li key={dayKey(day)} className="flex min-w-10 flex-1 flex-col items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-text-main">{count}</span>
                  <div
                    className={
                      isToday
                        ? "w-full rounded-t bg-primary-strong"
                        : "w-full rounded-t bg-primary-strong/30"
                    }
                    // Bars are data, so the height is data too. Floor at 4px so a
                    // day with nobody is still a visible tick rather than a gap
                    // the eye reads as missing.
                    style={{ height: `${Math.max(4, Math.round((count / busiest) * 96))}px` }}
                  />
                  <span className="whitespace-nowrap text-xs text-text-muted">{dayLabel(day)}</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-sm text-text-muted">How many meals you gave each day.</p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <BigButton
          href={`/mess/${messId}/checkin`}
          icon={<ClipboardCheck className="h-6 w-6" aria-hidden />}
          label="Mark who came"
          primary
        />
        <BigButton
          href={`/mess/${messId}/students`}
          icon={<Users className="h-6 w-6" aria-hidden />}
          label="Students"
        />
        <BigButton
          href={`/mess/${messId}/poster`}
          icon={<QrCode className="h-6 w-6" aria-hidden />}
          label="Print QR paper"
        />
      </section>
    </div>
  );
}

/**
 * Deliberately tall and full width.
 *
 * The person using this is often older and reading a phone at arm's length, so
 * these are 64px high rather than the 44-48px a younger thumb needs, and the
 * label is full-size text instead of the small print a compact button forces.
 */
function BigButton({
  href,
  icon,
  label,
  primary,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "flex min-h-16 items-center gap-4 rounded-2xl bg-primary-strong px-5 text-lg font-semibold text-white transition-colors hover:bg-primary-hover"
          : "flex min-h-16 items-center gap-4 rounded-2xl border-2 border-border bg-white px-5 text-lg font-semibold text-text-main transition-colors hover:bg-muted"
      }
    >
      {icon}
      {label}
    </Link>
  );
}
