import Link from "next/link";
import { Plus, Users, UtensilsCrossed, IndianRupee, ArrowUpRight } from "lucide-react";
import prisma from "@/lib/prisma";
import {
  attendanceDay,
  startOfIstMonth,
  dueDate,
  owesForMonth,
  mealAt,
  MEAL_LABEL,
  mealWindows,
  onRollDuringWhere,
} from "@/lib/mess";
import { feeBalance } from "@/lib/mess-finance";

export const metadata = { title: "All messes" };

/**
 * Every mess Aangan runs, with the three numbers that say whether it is alive:
 * who is on the roll, who ate at the meal being served, and how much this month
 * is still outstanding.
 *
 * Counted in three queries for the whole page rather than three per mess. At
 * today's scale either would do; the shape matters when there are fifty.
 */
export default async function MessAdminHome() {
  const now = new Date();
  const day = attendanceDay(now);
  const month = startOfIstMonth(now);

  const messes = await prisma.mess.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      dueDay: true,
      breakfastFrom: true,
      breakfastTo: true,
      lunchFrom: true,
      lunchTo: true,
      dinnerFrom: true,
      dinnerTo: true,
      members: {
        where: { role: "OWNER" },
        select: { user: { select: { name: true, email: true } } },
        take: 1,
      },
      // Everyone this month's money involves, which includes anyone who left
      // partway through it. How many students the mess has *today* is a
      // different question, counted separately below.
      students: {
        where: onRollDuringWhere(month),
        select: {
          id: true,
          joinedAt: true,
          leftAt: true,
          monthlyFee: true,
          payments: {
            where: { month },
            select: {
              amount: true,
              entries: { select: { kind: true, amount: true, reversedAt: true } },
            },
          },
        },
      },
    },
  });

  const studentIds = messes.flatMap((m) => m.students.map((s) => s.id));

  const [activeCounts, ateNow] = await Promise.all([
    prisma.student.groupBy({
      by: ["messId"],
      where: { leftAt: null },
      _count: { _all: true },
    }),
    // Every mess sets its own hours, so there is no single "meal being served"
    // across all of them. Today's rows come back once and each mess picks out
    // the meal that is its own right now.
    prisma.attendance.findMany({
      where: { day, studentId: { in: studentIds } },
      select: { studentId: true, meal: true },
    }),
  ]);

  const ateByMeal = ateNow;
  const active = new Map(activeCounts.map((r) => [r.messId, r._count._all]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-text-main">Messes</h1>
        <Link
          href="/mess-admin/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary-strong px-5 text-base font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add a mess
        </Link>
      </div>

      {messes.length === 0 ? (
        <p className="rounded-2xl border border-border bg-white p-8 text-center text-base text-text-muted">
          No mess yet. Add the first one.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {messes.map((mess) => {
            const due = dueDate(month, mess.dueDay);
            const unpaid = mess.students.reduce((sum, s) => {
              const owes = owesForMonth({
                joinedAt: s.joinedAt,
                leftAt: s.leftAt,
                monthlyFee: s.monthlyFee,
                due,
              });
              if (!owes) return sum;
              const statement = s.payments[0];
              return (
                sum +
                Math.max(0, feeBalance(statement?.amount ?? s.monthlyFee, statement?.entries ?? []))
              );
            }, 0);
            const windows = mealWindows(mess);
            const meal = mealAt(now, windows);
            const ids = new Set(mess.students.map((s) => s.id));
            const here = meal
              ? ateByMeal.filter((r) => r.meal === meal && ids.has(r.studentId)).length
              : 0;
            const owner = mess.members[0]?.user;

            return (
              <li key={mess.id}>
                <div className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
                  <div className="min-w-0">
                    <h2 className="truncate font-heading text-xl font-bold text-text-main">
                      {mess.name}
                    </h2>
                    <p className="truncate text-sm text-text-muted">
                      {owner?.name ?? owner?.email ?? "No owner"}
                    </p>
                  </div>

                  <dl className="grid grid-cols-3 gap-2">
                    <Stat
                      icon={<Users className="h-4 w-4" aria-hidden />}
                      label="Students"
                      value={String(active.get(mess.id) ?? 0)}
                    />
                    <Stat
                      icon={<UtensilsCrossed className="h-4 w-4" aria-hidden />}
                      label={meal ? MEAL_LABEL[meal] : "No meal"}
                      value={meal ? String(here) : "—"}
                    />
                    <Stat
                      icon={<IndianRupee className="h-4 w-4" aria-hidden />}
                      label="Unpaid"
                      value={unpaid.toLocaleString("en-IN")}
                      alert={unpaid > 0}
                    />
                  </dl>

                  <div className="mt-auto flex flex-wrap gap-2">
                    <Link
                      href={`/mess-admin/${mess.id}`}
                      className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-text-main transition-colors hover:bg-slate-50"
                    >
                      Manage access
                    </Link>
                    {/* Admin passes `requireMess`, so this really is the owner's
                        own screen — the one to look at when he calls. */}
                    <Link
                      href={`/mess/${mess.id}`}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-text-main transition-colors hover:bg-slate-200"
                    >
                      Open as owner
                      <ArrowUpRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
        {icon}
        <span className="truncate">{label}</span>
      </dt>
      <dd
        className={
          alert
            ? "mt-1 font-heading text-xl font-bold tabular-nums text-red-800"
            : "mt-1 font-heading text-xl font-bold tabular-nums text-text-main"
        }
      >
        {value}
      </dd>
    </div>
  );
}
