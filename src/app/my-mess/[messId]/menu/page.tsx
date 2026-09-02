import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { findStudent } from "@/actions/mess";
import {
  attendanceDay,
  menuFor,
  mealAt,
  weekdayOf,
  MEAL_WINDOWS,
  WEEKDAY_LABEL,
} from "@/lib/mess";

export const metadata = { title: "Menu" };

/** `7:00 AM` from minutes past midnight. */
function clockLabel(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour >= 12 ? "PM" : "AM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export default async function StudentMenuPage({
  params,
}: {
  params: Promise<{ messId: string }>;
}) {
  const { messId } = await params;

  const student = await findStudent(messId);
  if (!student) redirect("/my-mess");

  const now = new Date();
  const day = attendanceDay(now);
  const servingNow = mealAt(now);

  const rows = await prisma.menuItem.findMany({
    where: { messId },
    select: { weekday: true, date: true, meal: true, items: true },
  });

  // The week ahead, starting today, so "what's tomorrow" is one glance down the
  // page rather than a calculation about which weekday it is.
  const week = Array.from(
    { length: 7 },
    (_, offset) => new Date(day.getTime() + offset * 24 * 60 * 60 * 1000),
  );

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Link
        href={`/my-mess/${messId}`}
        className="inline-flex min-h-12 items-center text-base font-medium text-primary-strong underline underline-offset-4"
      >
        ← Back
      </Link>

      <h1 className="mt-2 font-heading text-3xl font-bold text-text-main">Food</h1>

      <div className="mt-4 flex flex-col gap-3">
        {week.map((date, offset) => (
          <section
            key={date.toISOString()}
            className={
              offset === 0
                ? "rounded-2xl border-2 border-primary-strong bg-white p-5"
                : "rounded-2xl border-2 border-border bg-white p-5"
            }
          >
            <h2 className="font-heading text-lg font-bold text-text-main">
              {offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : WEEKDAY_LABEL[weekdayOf(date)]}
            </h2>

            <ul className="mt-2 flex flex-col gap-2">
              {MEAL_WINDOWS.map((window) => {
                const items = menuFor(rows, date, window.meal);
                const isNow = offset === 0 && window.meal === servingNow;
                return (
                  <li key={window.meal} className="border-b border-border pb-2 last:border-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-base font-semibold text-text-main">
                        {window.label}
                        {isNow && (
                          <span className="ml-2 rounded-full bg-primary-strong px-3 py-1 text-sm font-semibold text-white">
                            Now
                          </span>
                        )}
                      </span>
                      <span className="text-base tabular-nums text-text-muted">
                        {clockLabel(window.from)}
                      </span>
                    </div>
                    <p className="mt-1 text-base text-text-muted">{items ?? "Not added yet"}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
