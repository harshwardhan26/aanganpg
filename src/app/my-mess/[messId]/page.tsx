import Link from "next/link";
import { redirect } from "next/navigation";
import { QrCode, UtensilsCrossed, CalendarCheck, Wallet } from "lucide-react";
import prisma from "@/lib/prisma";
import { findStudent } from "@/actions/mess";
import {
  attendanceDay,
  startOfIstMonth,
  monthLabel,
  dueDate,
  owesForMonth,
  menuFor,
  mealAt,
  MEAL_LABEL,
} from "@/lib/mess";

export const metadata = { title: "My mess" };

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
  const servingNow = mealAt(now);

  const [mess, todayRows, monthCount, payment, menuRows] = await Promise.all([
    prisma.mess.findUnique({ where: { id: messId }, select: { name: true, dueDay: true } }),
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

  const markedMeals = new Set(todayRows.map((row) => row.meal));
  const due = dueDate(month, mess.dueDay);
  const owes =
    owesForMonth({
      joinedAt: found.joinedAt,
      leftAt: found.leftAt,
      monthlyFee: found.monthlyFee,
      due,
    }) && payment?.paidAt == null;

  const nextMenu = servingNow ? menuFor(menuRows, day, servingNow) : null;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-8">
      <header>
        <p className="font-heading text-xs font-semibold tracking-wide text-text-muted uppercase">
          {found.name}
        </p>
        <h1 className="font-heading text-2xl font-bold text-text-main">{mess.name}</h1>
      </header>

      {/* Money first, and only when something is owed — it is the one thing here
          that needs the student to go and do something today. */}
      {owes && (
        <Link
          href={`/my-mess/${messId}/payment`}
          className="rounded-xl border border-red-700 bg-red-100 p-4 text-red-900"
        >
          <p className="font-heading text-base font-semibold">
            ₹{(payment?.amount ?? found.monthlyFee ?? 0).toLocaleString("en-IN")} pending for{" "}
            {monthLabel(month)}
          </p>
          <p className="mt-0.5 text-sm">Pay at the mess counter.</p>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Option
          href={`/my-mess/${messId}/scan`}
          icon={<QrCode className="h-5 w-5" aria-hidden />}
          title="Mark my meal"
          detail={
            servingNow
              ? markedMeals.has(servingNow)
                ? `${MEAL_LABEL[servingNow]} marked`
                : `${MEAL_LABEL[servingNow]} being served`
              : "No meal right now"
          }
          highlight={Boolean(servingNow) && !markedMeals.has(servingNow!)}
        />

        <Option
          href={`/my-mess/${messId}/menu`}
          icon={<UtensilsCrossed className="h-5 w-5" aria-hidden />}
          title="Today's menu"
          detail={nextMenu ?? "See the week"}
        />

        <Option
          href={`/my-mess/${messId}/history`}
          icon={<CalendarCheck className="h-5 w-5" aria-hidden />}
          title="My attendance"
          detail={`${monthCount} meals this month`}
        />

        <Option
          href={`/my-mess/${messId}/payment`}
          icon={<Wallet className="h-5 w-5" aria-hidden />}
          title="My payment"
          detail={owes ? "Pending" : payment?.paidAt ? "Paid" : "Nothing due"}
        />
      </div>
    </main>
  );
}

function Option({
  href,
  icon,
  title,
  detail,
  highlight,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        highlight
          ? "flex flex-col gap-2 rounded-xl border-2 border-primary-strong bg-white p-4"
          : "flex flex-col gap-2 rounded-xl border border-border bg-white p-4"
      }
    >
      <span className={highlight ? "text-primary-strong" : "text-text-muted"}>{icon}</span>
      <span className="font-heading text-sm font-semibold text-text-main">{title}</span>
      {/* Two lines maximum: a menu is long, and a card that grows to fit it
          breaks the grid into uneven halves. */}
      <span className="line-clamp-2 text-xs text-text-muted">{detail}</span>
    </Link>
  );
}
