import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireMess } from "@/actions/mess";
import { displayPhone } from "@/lib/phone";
import {
  attendanceDay,
  startOfIstMonth,
  monthKey,
  monthLabel,
  dueDate,
  owesForMonth,
  onRollDuringWhere,
} from "@/lib/mess";
import { PaidToggle } from "./PaidToggle";

export const metadata = { title: "Fees" };

/** `2026-09` from the query string, or this month. Anything else is this month. */
function parseMonth(raw: string | string[] | undefined, now: Date): Date {
  const value = typeof raw === "string" && /^\d{4}-\d{2}$/.test(raw) ? raw : null;
  if (!value) return startOfIstMonth(now);
  const parsed = new Date(`${value}-01T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? startOfIstMonth(now) : parsed;
}

export default async function FeesPage({
  params,
  searchParams,
}: {
  params: Promise<{ messId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { messId } = await params;

  // Staff never see money. The nav hides this tab from them; this is what makes
  // typing the URL do nothing.
  const { role } = await requireMess(messId, "STAFF");
  if (role === "STAFF") redirect(`/mess/${messId}`);

  const now = new Date();
  const month = parseMonth((await searchParams).month, now);
  const today = attendanceDay(now);

  const mess = await prisma.mess.findUnique({
    where: { id: messId },
    select: { dueDay: true },
  });
  if (!mess) redirect("/mess");

  const due = dueDate(month, mess.dueDay);
  const isPast = today.getTime() >= due.getTime();

  // Everyone who was on the roll during this month, not everyone on it today.
  // Filtering by `leftAt: null` removed a student from every month they had
  // ever been billed for the moment they left — so "Money you got" fell by
  // their fee, and an unpaid leaver vanished off the chase list.
  const students = await prisma.student.findMany({
    where: { messId, ...onRollDuringWhere(month) },
    select: {
      id: true,
      name: true,
      parentPhone: true,
      monthlyFee: true,
      joinedAt: true,
      leftAt: true,
      payments: {
        where: { month },
        select: { paidAt: true, amount: true, remindersSent: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = students.map((student) => {
    const payment = student.payments[0] ?? null;
    const owes = owesForMonth({
      joinedAt: student.joinedAt,
      leftAt: student.leftAt,
      monthlyFee: student.monthlyFee,
      due,
    });
    return {
      id: student.id,
      name: student.name,
      left: student.leftAt != null,
      parentPhone: student.parentPhone,
      amount: payment?.amount ?? student.monthlyFee,
      paid: payment?.paidAt != null,
      remindersSent: payment?.remindersSent ?? 0,
      owes,
    };
  });

  const collected = rows
    .filter((r) => r.paid)
    .reduce((total, r) => total + (r.amount ?? 0), 0);
  const pending = rows
    .filter((r) => r.owes && !r.paid)
    .reduce((total, r) => total + (r.amount ?? 0), 0);
  const overdueCount = isPast ? rows.filter((r) => r.owes && !r.paid).length : 0;

  const prev = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() - 1, 1));
  const next = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
  const showNext = next.getTime() <= startOfIstMonth(now).getTime();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/mess/${messId}/fees?month=${monthKey(prev)}`}
          className="flex min-h-12 items-center rounded-xl border-2 border-border px-4 text-base font-medium text-text-muted transition-colors hover:bg-muted"
        >
          ← {monthLabel(prev).split(" ")[0]}
        </Link>
        <h1 className="font-heading text-xl font-bold text-text-main">{monthLabel(month)}</h1>
        {showNext ? (
          <Link
            href={`/mess/${messId}/fees?month=${monthKey(next)}`}
            className="flex min-h-12 items-center rounded-xl border-2 border-border px-4 text-base font-medium text-text-muted transition-colors hover:bg-muted"
          >
            {monthLabel(next).split(" ")[0]} →
          </Link>
        ) : (
          <span className="w-20" />
        )}
      </div>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Money you got" value={`₹${collected.toLocaleString("en-IN")}`} />
        <Stat label="Money left" value={`₹${pending.toLocaleString("en-IN")}`} />
        <Stat
          label={isPast ? "Did not pay" : `Pay by ${mess.dueDay}`}
          value={isPast ? String(overdueCount) : "—"}
          tone={overdueCount > 0 ? "alert" : undefined}
        />
      </section>

      {rows.length === 0 ? (
        <p className="rounded-2xl border-2 border-border bg-white p-8 text-center text-base text-text-muted">
          No students yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex min-h-20 items-center justify-between gap-3 rounded-2xl border-2 border-border bg-white p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-text-main">
                  {row.name}
                  {row.left && (
                    <span className="ml-2 rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-text-muted">
                      left
                    </span>
                  )}
                </p>
                <p className="mt-1 text-base text-text-muted">
                  {row.amount === null ? "No fee set" : `₹${row.amount.toLocaleString("en-IN")}`}
                  {row.paid && " · paid"}
                  {!row.paid && row.owes && isPast && (
                    <span className="font-medium text-red-800"> · not paid</span>
                  )}
                  {row.remindersSent > 0 &&
                    ` · told parents ${row.remindersSent} time${row.remindersSent > 1 ? "s" : ""}`}
                </p>
                {row.parentPhone ? (
                  <p className="text-base text-text-muted">{displayPhone(row.parentPhone)}</p>
                ) : (
                  row.owes && (
                    <p className="text-base text-amber-800">No parent phone number</p>
                  )
                )}
              </div>

              <PaidToggle
                messId={messId}
                studentId={row.id}
                month={monthKey(month)}
                paid={row.paid}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "alert";
}) {
  return (
    <div className="rounded-2xl border-2 border-border bg-white p-4">
      <p
        className={
          tone === "alert"
            ? "font-heading text-2xl font-bold tabular-nums text-red-800"
            : "font-heading text-2xl font-bold tabular-nums text-text-main"
        }
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-text-muted">{label}</p>
    </div>
  );
}
