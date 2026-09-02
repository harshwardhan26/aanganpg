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

  const students = await prisma.student.findMany({
    where: { messId, leftAt: null },
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
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-muted"
        >
          ← {monthLabel(prev).split(" ")[0]}
        </Link>
        <h1 className="font-heading text-lg font-semibold text-text-main">{monthLabel(month)}</h1>
        {showNext ? (
          <Link
            href={`/mess/${messId}/fees?month=${monthKey(next)}`}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-muted"
          >
            {monthLabel(next).split(" ")[0]} →
          </Link>
        ) : (
          <span className="w-20" />
        )}
      </div>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Collected" value={`₹${collected.toLocaleString("en-IN")}`} />
        <Stat label="Pending" value={`₹${pending.toLocaleString("en-IN")}`} />
        <Stat
          label={isPast ? "Overdue" : `Due on the ${mess.dueDay}th`}
          value={isPast ? String(overdueCount) : "—"}
          tone={overdueCount > 0 ? "alert" : undefined}
        />
      </section>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-border bg-white p-6 text-center text-sm text-text-muted">
          No students on the rolls yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-text-main">{row.name}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {row.amount === null
                    ? "No fee set"
                    : `₹${row.amount.toLocaleString("en-IN")}`}
                  {row.paid && " · paid"}
                  {!row.paid && row.owes && isPast && (
                    <span className="text-red-700"> · overdue</span>
                  )}
                  {row.remindersSent > 0 &&
                    ` · ${row.remindersSent} reminder${row.remindersSent > 1 ? "s" : ""} sent`}
                  {!row.parentPhone && row.owes && (
                    <span className="text-amber-700"> · no parent number</span>
                  )}
                </p>
                {row.parentPhone && (
                  <p className="text-xs text-text-muted">{displayPhone(row.parentPhone)}</p>
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
    <div className="rounded-xl border border-border bg-white p-4">
      <p
        className={
          tone === "alert"
            ? "font-heading text-xl font-bold tabular-nums text-red-700"
            : "font-heading text-xl font-bold tabular-nums text-text-main"
        }
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-text-muted">{label}</p>
    </div>
  );
}
