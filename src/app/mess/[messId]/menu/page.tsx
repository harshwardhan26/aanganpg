import prisma from "@/lib/prisma";
import { requireMessOwner } from "@/actions/mess";
import {
  WEEKDAY_LABEL,
  mealWindows,
  DEFAULT_MEAL_TIMES,
  MESS_TIMES_SELECT,
  attendanceDay,
  weekdayOf,
} from "@/lib/mess";
import { MenuSlot } from "./MenuSlot";
import { MealTimes } from "./MealTimes";

export const metadata = { title: "Menu" };

export default async function MenuPage({ params }: { params: Promise<{ messId: string }> }) {
  const { messId } = await params;
  await requireMessOwner(messId);

  const mess = await prisma.mess.findUnique({
    where: { id: messId },
    select: MESS_TIMES_SELECT,
  });
  const windows = mealWindows(mess ?? DEFAULT_MEAL_TIMES);

  const rows = await prisma.menuItem.findMany({
    where: { messId, date: null },
    select: { weekday: true, meal: true, items: true },
  });

  const today = weekdayOf(attendanceDay(new Date()));
  const bySlot = new Map(rows.map((row) => [`${row.weekday}:${row.meal}`, row.items]));

  return (
    <div className="flex flex-col gap-5">
      <MealTimes messId={messId} times={mess ?? DEFAULT_MEAL_TIMES} />

      <div>
        <h1 className="font-heading text-2xl font-bold text-text-main">Food menu</h1>
        <p className="mt-2 text-base text-text-muted">
          Write the food one time. It shows every week. Students see it on their phone. Leave a box
          empty if you did not decide yet.
        </p>
      </div>

      {WEEKDAY_LABEL.map((label, weekday) => (
        <section
          key={label}
          className={
            weekday === today
              ? "rounded-2xl border-2 border-primary-strong bg-white p-5"
              : "rounded-2xl border-2 border-border bg-white p-5"
          }
        >
          <h2 className="font-heading text-lg font-bold text-text-main">
            {label}
            {weekday === today && (
              <span className="ml-2 rounded-full bg-primary-strong px-3 py-1 text-sm font-semibold text-white">
                Today
              </span>
            )}
          </h2>

          <div className="mt-4 flex flex-col gap-4">
            {windows.map((window) => (
              <MenuSlot
                key={window.meal}
                messId={messId}
                weekday={weekday}
                meal={window.meal}
                label={window.label}
                items={bySlot.get(`${weekday}:${window.meal}`) ?? ""}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
