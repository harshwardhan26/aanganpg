import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireMess } from "@/actions/mess";
import { WEEKDAY_LABEL, MEAL_WINDOWS, attendanceDay, weekdayOf } from "@/lib/mess";
import { MenuSlot } from "./MenuSlot";

export const metadata = { title: "Menu" };

export default async function MenuPage({
  params,
}: {
  params: Promise<{ messId: string }>;
}) {
  const { messId } = await params;
  const { role } = await requireMess(messId, "STAFF");
  if (role === "STAFF") redirect(`/mess/${messId}`);

  const rows = await prisma.menuItem.findMany({
    where: { messId, date: null },
    select: { weekday: true, meal: true, items: true },
  });

  const today = weekdayOf(attendanceDay(new Date()));
  const bySlot = new Map(rows.map((row) => [`${row.weekday}:${row.meal}`, row.items]));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-lg font-semibold text-text-main">Weekly menu</h1>
        <p className="mt-1 text-sm text-text-muted">
          Fill this in once. It repeats every week, and students see it on their phone. Leave a box
          empty and that meal shows as not put up yet.
        </p>
      </div>

      {WEEKDAY_LABEL.map((label, weekday) => (
        <section
          key={label}
          className={
            weekday === today
              ? "rounded-xl border-2 border-primary-strong bg-white p-4"
              : "rounded-xl border border-border bg-white p-4"
          }
        >
          <h2 className="font-heading text-base font-semibold text-text-main">
            {label}
            {weekday === today && (
              <span className="ml-2 rounded-full bg-primary-strong px-2 py-0.5 text-xs font-medium text-white">
                Today
              </span>
            )}
          </h2>

          <div className="mt-3 flex flex-col gap-3">
            {MEAL_WINDOWS.map((window) => (
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
