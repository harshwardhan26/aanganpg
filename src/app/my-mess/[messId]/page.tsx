import Link from "next/link";
import { redirect } from "next/navigation";
import { QrCode, UtensilsCrossed, CalendarCheck, Wallet, Check, ChevronRight } from "lucide-react";
import prisma from "@/lib/prisma";
import { findStudent } from "@/actions/mess";
import { AanganStrip } from "@/components/mess/AanganStrip";
import {
  attendanceDay,
  startOfIstMonth,
  monthLabel,
  dueDate,
  owesForMonth,
  feeState,
  menuFor,
  mealAt,
  nearestMeal,
  plural,
  MEAL_LABEL,
  mealWindows,
  clockLabel,
  MESS_TIMES_SELECT,
} from "@/lib/mess";

export const metadata = { title: "My mess" };


/**
 * The screen a student opens at the counter.
 *
 * Built around one question — can I eat right now, and have I marked it — with
 * everything else stepping back behind it. The four equal tiles this replaced
 * made a student read all four every time to find the one they came for.
 */
export default async function StudentMessPage({
  params,
}: {
  params: Promise<{ messId: string }>;
}) {
  const { messId } = await params;

  const found = await findStudent(messId);
  if (!found) redirect("/my-mess");

  const now = new Date();
  const day = attendanceDay(now);
  const month = startOfIstMonth(now);
  const servingNow = null as ReturnType<typeof mealAt>;

  const [mess, todayRows, monthCount, payment, menuRows] = await Promise.all([
    prisma.mess.findUnique({
      where: { id: messId },
      select: { name: true, dueDay: true, ...MESS_TIMES_SELECT },
    }),
    prisma.attendance.findMany({ where: { studentId: found.id, day }, select: { meal: true } }),
    prisma.attendance.count({ where: { studentId: found.id, day: { gte: month } } }),
    prisma.payment.findUnique({
      where: { studentId_month: { studentId: found.id, month } },
      select: { paidAt: true, amount: true },
    }),
    prisma.menuItem.findMany({
      where: { messId },
      select: { weekday: true, date: true, meal: true, items: true },
    }),
  ]);
  if (!mess) redirect("/my-mess");

  const windows = mealWindows(mess);
  const serving = mealAt(now, windows);
  const markedMeals = new Set(todayRows.map((row) => row.meal));
  const due = dueDate(month, mess.dueDay);
  const state = feeState({
    today: day,
    due,
    owes: owesForMonth({
      joinedAt: found.joinedAt,
      leftAt: found.leftAt,
      monthlyFee: found.monthlyFee,
      due,
    }),
    paid: payment?.paidAt != null,
  });
  const amount = payment?.amount ?? found.monthlyFee ?? 0;

  // The meal the card is about: the one being served, or the next one up.
  const focusMeal = serving ?? nearestMeal(now, windows);
  const focusWindow = windows.find((w) => w.meal === focusMeal)!;
  const done = markedMeals.has(focusMeal);
  const food = menuFor(menuRows, day, focusMeal);
  const firstName = found.name.trim().split(/\s+/)[0];

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pt-6 pb-10">
      <header className="rise flex items-baseline justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-text-main">Hi, {firstName}</h1>
        <span className="truncate text-sm font-medium text-text-muted">{mess.name}</span>
      </header>

      {/* THE CARD. Everything a student opens this for is on it. */}
      <section
        className="rise overflow-hidden rounded-3xl shadow-[var(--shadow-soft-lg)]"
        style={{ "--rise-delay": "60ms" } as React.CSSProperties}
      >
        <div
          className={
            done
              ? "bg-gradient-to-br from-[#0d542b] to-[#052e16] p-6 text-white"
              : "bg-gradient-to-br from-[#cc4040] to-[#7f1d1d] p-6 text-white"
          }
        >
          <p className="flex items-center gap-2.5 text-sm font-semibold tracking-wide text-white/85 uppercase">
            {servingNow && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="live-dot absolute inline-flex h-full w-full" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
              </span>
            )}
            {servingNow ? "Serving now" : `Next · ${clockLabel(focusWindow.from)}`}
          </p>

          <p className="mt-2 font-heading text-4xl font-bold">{MEAL_LABEL[focusMeal]}</p>
          {/* Two lines at most: a long menu must not push the button off screen. */}
          <p className="mt-1 line-clamp-2 text-base text-white/90">
            {food ?? "Menu not added yet"}
          </p>

          {done ? (
            <p className="mt-5 flex min-h-14 items-center gap-2 rounded-2xl bg-white/15 px-5 text-lg font-semibold">
              <Check className="h-5 w-5" aria-hidden />
              Marked. Enjoy your food.
            </p>
          ) : (
            <Link
              href={`/my-mess/${messId}/scan`}
              className="mt-5 flex min-h-14 items-center justify-between gap-2 rounded-2xl bg-white px-5 text-lg font-semibold text-primary-strong transition-transform duration-200 active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                <QrCode className="h-5 w-5" aria-hidden />
                Mark my food
              </span>
              <ChevronRight className="h-5 w-5" aria-hidden />
            </Link>
          )}
        </div>
      </section>

      {state === "overdue" && (
        <Money
          href={`/my-mess/${messId}/payment`}
          tone="late"
          title={`₹${amount.toLocaleString("en-IN")} not paid`}
          detail={`${monthLabel(month)} · please pay at the mess`}
        />
      )}
      {state === "due" && (
        <Money
          href={`/my-mess/${messId}/payment`}
          tone="due"
          title={`₹${amount.toLocaleString("en-IN")} for ${monthLabel(month).split(" ")[0]}`}
          detail={`Pay by ${mess.dueDay} ${monthLabel(month).split(" ")[0]} at the mess`}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Tile
          href={`/my-mess/${messId}/menu`}
          delay={140}
          icon={<UtensilsCrossed className="h-5 w-5" aria-hidden />}
          tint="bg-amber-50 text-amber-800"
          title="Food"
          detail="This week"
        />
        <Tile
          href={`/my-mess/${messId}/history`}
          delay={190}
          icon={<CalendarCheck className="h-5 w-5" aria-hidden />}
          tint="bg-emerald-50 text-emerald-800"
          title="My meals"
          detail={`${plural(monthCount, "meal")} this month`}
        />
        <Tile
          href={`/my-mess/${messId}/payment`}
          delay={240}
          icon={<Wallet className="h-5 w-5" aria-hidden />}
          tint="bg-slate-100 text-text-main"
          title="My fees"
          detail={
            state === "overdue"
              ? "Not paid"
              : state === "due"
                ? `Pay by ${mess.dueDay}`
                : state === "paid"
                  ? "Paid"
                  : "Nothing to pay"
          }
        />
        <Tile
          href={`/my-mess/${messId}/scan`}
          delay={290}
          icon={<QrCode className="h-5 w-5" aria-hidden />}
          tint="bg-red-50 text-primary-strong"
          title="Scan"
          detail="At the counter"
        />
      </div>

      {/* Under everything they came for, never above it. A student opening this
          in a queue is here for the card at the top. */}
      <AanganStrip className="rounded-2xl shadow-[var(--shadow-soft)]" />
    </main>
  );
}

function Money({
  href,
  tone,
  title,
  detail,
}: {
  href: string;
  tone: "late" | "due";
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      style={{ "--rise-delay": "100ms" } as React.CSSProperties}
      className={
        tone === "late"
          ? "rise flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-[var(--shadow-soft)]"
          : "rise flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 shadow-[var(--shadow-soft)]"
      }
    >
      <span className="min-w-0">
        <span
          className={
            tone === "late"
              ? "block font-heading text-lg font-bold text-red-900"
              : "block font-heading text-lg font-bold text-text-main"
          }
        >
          {title}
        </span>
        <span
          className={
            tone === "late" ? "block text-sm text-red-900" : "block text-sm text-text-muted"
          }
        >
          {detail}
        </span>
      </span>
      <ChevronRight
        className={tone === "late" ? "h-5 w-5 shrink-0 text-red-900" : "h-5 w-5 shrink-0 text-slate-400"}
        aria-hidden
      />
    </Link>
  );
}

function Tile({
  href,
  icon,
  tint,
  title,
  detail,
  delay,
}: {
  href: string;
  icon: React.ReactNode;
  tint: string;
  title: string;
  detail: string;
  delay: number;
}) {
  return (
    <Link
      href={href}
      style={{ "--rise-delay": `${delay}ms` } as React.CSSProperties}
      className="rise flex min-h-28 flex-col gap-2 rounded-2xl border border-border bg-white p-4 shadow-[var(--shadow-soft)] transition-transform duration-200 active:scale-[0.98]"
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>{icon}</span>
      <span className="font-heading text-base font-bold text-text-main">{title}</span>
      <span className="line-clamp-1 text-sm text-text-muted">{detail}</span>
    </Link>
  );
}
