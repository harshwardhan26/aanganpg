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
  feeState,
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

  const nextMenu = servingNow ? menuFor(menuRows, day, servingNow) : null;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-8">
      <header>
        <p className="text-base text-text-muted">{found.name}</p>
        <h1 className="font-heading text-3xl font-bold text-text-main">{mess.name}</h1>
      </header>

      {/* Money first, and only when something is owed — it is the one thing here
          that needs the student to go and do something today. */}
      {/* Red only once the money is actually late. Before the due date this is
          a reminder, and colouring it as a warning sends a student to argue
          with the mess about a payment that is not yet owed. */}
      {state === "overdue" && (
        <Link
          href={`/my-mess/${messId}/payment`}
          className="rounded-2xl border-2 border-red-800 bg-red-100 p-5 text-red-900"
        >
          <p className="font-heading text-xl font-bold">
            ₹{amount.toLocaleString("en-IN")} not paid for {monthLabel(month)}
          </p>
          <p className="mt-1 text-base">Please pay at the mess.</p>
        </Link>
      )}

      {state === "due" && (
        <Link
          href={`/my-mess/${messId}/payment`}
          className="rounded-2xl border-2 border-border bg-white p-5"
        >
          <p className="font-heading text-xl font-bold text-text-main">
            ₹{amount.toLocaleString("en-IN")} for {monthLabel(month)}
          </p>
          <p className="mt-1 text-base text-text-muted">
            Pay by {mess.dueDay} {monthLabel(month).split(" ")[0]} at the mess.
          </p>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Option
          href={`/my-mess/${messId}/scan`}
          icon={<QrCode className="h-7 w-7" aria-hidden />}
          title="Mark my food"
          detail={
            servingNow
              ? markedMeals.has(servingNow)
                ? `${MEAL_LABEL[servingNow]} done`
                : `${MEAL_LABEL[servingNow]} is ready`
              : "No food right now"
          }
          highlight={Boolean(servingNow) && !markedMeals.has(servingNow!)}
        />

        <Option
          href={`/my-mess/${messId}/menu`}
          icon={<UtensilsCrossed className="h-7 w-7" aria-hidden />}
          title="Today's food"
          detail={nextMenu ?? "See this week"}
        />

        <Option
          href={`/my-mess/${messId}/history`}
          icon={<CalendarCheck className="h-7 w-7" aria-hidden />}
          title="My meals"
          detail={`${monthCount} this month`}
        />

        <Option
          href={`/my-mess/${messId}/payment`}
          icon={<Wallet className="h-7 w-7" aria-hidden />}
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
          ? "flex min-h-32 flex-col gap-2 rounded-2xl border-2 border-primary-strong bg-white p-5"
          : "flex min-h-32 flex-col gap-2 rounded-2xl border-2 border-border bg-white p-5"
      }
    >
      <span className={highlight ? "text-primary-strong" : "text-text-muted"}>{icon}</span>
      <span className="font-heading text-lg font-bold text-text-main">{title}</span>
      {/* Two lines maximum: a menu is long, and a card that grows to fit it
          breaks the grid into uneven halves. */}
      <span className="line-clamp-2 text-base text-text-muted">{detail}</span>
    </Link>
  );
}
