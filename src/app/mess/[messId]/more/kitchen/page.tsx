import prisma from "@/lib/prisma";
import { attendanceDay, dayLabel, MEAL_LABEL } from "@/lib/mess";
import { KitchenForm } from "./KitchenForm";

export const metadata = { title: "Kitchen planning" };

export default async function KitchenPage({ params }: { params: Promise<{ messId: string }> }) {
  const { messId } = await params;
  const today = attendanceDay(new Date());
  const days = Array.from({ length: 7 }, (_, index) => new Date(today.getTime() + index * 24 * 60 * 60 * 1000));
  const through = days.at(-1)!;
  const [active, skips, logs] = await Promise.all([
    prisma.student.count({ where: { messId, leftAt: null } }),
    prisma.mealSkip.groupBy({ by: ["day", "meal"], where: { messId, day: { gte: today, lte: through } }, _count: { _all: true } }),
    prisma.kitchenLog.findMany({ where: { messId, day: { gte: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000) } }, orderBy: [{ day: "desc" }, { meal: "asc" }], take: 30 }),
  ]);
  const skipped = new Map(skips.map((row) => [`${row.day.toISOString().slice(0, 10)}:${row.meal}`, row._count._all]));
  return <div><h1 className="font-heading text-3xl font-bold text-text-main">Kitchen planning</h1><p className="mt-1 text-base text-text-muted">Expected meals use active students minus submitted skips.</p><section className="mt-5 overflow-x-auto rounded-2xl border-2 border-border bg-white p-4"><table className="w-full min-w-[34rem] border-collapse text-left"><caption className="sr-only">Expected meal counts for the next seven days</caption><thead><tr className="border-b-2 border-border text-sm text-text-muted"><th className="p-3">Day</th>{(["BREAKFAST", "LUNCH", "DINNER"] as const).map((meal) => <th key={meal} className="p-3">{MEAL_LABEL[meal]}</th>)}</tr></thead><tbody>{days.map((day) => { const key = day.toISOString().slice(0, 10); return <tr key={key} className="border-b border-border last:border-0"><th className="p-3 font-semibold text-text-main">{dayLabel(day)}</th>{(["BREAKFAST", "LUNCH", "DINNER"] as const).map((meal) => { const count = skipped.get(`${key}:${meal}`) ?? 0; return <td key={meal} className="p-3"><span className="font-heading text-xl font-bold text-text-main">{Math.max(0, active - count)}</span><span className="ml-1 text-sm text-text-muted">expected{count ? ` · ${count} skip` : ""}</span></td>; })}</tr>; })}</tbody></table></section><div className="mt-5"><KitchenForm messId={messId} defaultDay={today.toISOString().slice(0, 10)} /></div><section className="mt-6"><h2 className="font-heading text-xl font-bold text-text-main">Recent waste</h2>{logs.length === 0 ? <p className="mt-3 rounded-2xl border-2 border-border bg-white p-6 text-text-muted">No kitchen numbers recorded yet.</p> : <ul className="mt-3 flex flex-col gap-3">{logs.map((log) => <li key={log.id} className="flex items-center justify-between rounded-2xl border-2 border-border bg-white p-4"><div><p className="font-semibold text-text-main">{dayLabel(log.day)} · {MEAL_LABEL[log.meal]}</p><p className="text-sm text-text-muted">{log.preparedCount} prepared</p></div><p className={log.leftoverCount > 0 ? "font-heading text-xl font-bold text-amber-800" : "font-heading text-xl font-bold text-green-900"}>{log.leftoverCount} left</p></li>)}</ul>}</section></div>;
}
