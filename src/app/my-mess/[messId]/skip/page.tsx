import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { findStudent } from "@/actions/mess";
import { attendanceDay, canChangeMealSkip, clockLabel, dayLabel, MEAL_LABEL } from "@/lib/mess";
import { SkipButton } from "./SkipButton";

export const metadata = { title: "Skip meals" };

export default async function SkipMealsPage({ params }: { params: Promise<{ messId: string }> }) {
  const { messId } = await params;
  const student = await findStudent(messId);
  if (!student) redirect("/my-mess");
  const now = new Date();
  const today = attendanceDay(now);
  const days = Array.from(
    { length: 8 },
    (_, index) => new Date(today.getTime() + index * 24 * 60 * 60 * 1000),
  );
  const [mess, skips] = await Promise.all([
    prisma.mess.findUnique({ where: { id: messId }, select: { skipCutoffMinutes: true } }),
    prisma.mealSkip.findMany({
      where: { studentId: student.id, day: { gte: today, lte: days.at(-1)! } },
      select: { day: true, meal: true },
    }),
  ]);
  if (!mess) redirect("/my-mess");
  const skipped = new Set(skips.map((row) => `${row.day.toISOString().slice(0, 10)}:${row.meal}`));
  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-6">
      <Link
        href={`/my-mess/${messId}`}
        className="inline-flex min-h-11 items-center font-semibold text-primary-strong"
      >
        ← My mess
      </Link>
      <h1 className="mt-2 font-heading text-3xl font-bold text-text-main">Skip meals</h1>
      <p className="mt-2 text-base text-text-muted">
        Tell the kitchen by {clockLabel(mess.skipCutoffMinutes)} on the previous day. You can change
        your answer until then.
      </p>
      <ul className="mt-6 flex flex-col gap-4">
        {days.map((day) => {
          const key = day.toISOString().slice(0, 10);
          const open = canChangeMealSkip(day, mess.skipCutoffMinutes, now);
          return (
            <li key={key} className="rounded-2xl border-2 border-border bg-white p-4">
              <h2 className="font-heading text-lg font-bold text-text-main">{dayLabel(day)}</h2>
              <div className="mt-3 grid gap-3">
                {(["BREAKFAST", "LUNCH", "DINNER"] as const).map((meal) => (
                  <div key={meal} className="flex min-h-12 items-start justify-between gap-3">
                    <span className="py-2.5 text-base font-medium text-text-main">
                      {MEAL_LABEL[meal]}
                    </span>
                    <SkipButton
                      messId={messId}
                      day={key}
                      meal={meal}
                      skipped={skipped.has(`${key}:${meal}`)}
                      disabled={!open}
                    />
                  </div>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
