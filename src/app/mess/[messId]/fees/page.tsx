import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, Download, ChevronRight } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireMess } from "@/actions/mess";
import { attendanceDay, startOfIstMonth, monthKey, monthLabel, dueDate, onRollDuringWhere } from "@/lib/mess";
import { feeBalance, feeStatus, money, type FeeStatus } from "@/lib/mess-finance";

export const metadata = { title: "Collections" };

function parseMonth(raw: string | string[] | undefined, now: Date): Date {
  const value = typeof raw === "string" && /^\d{4}-\d{2}$/.test(raw) ? raw : null;
  if (!value) return startOfIstMonth(now);
  const parsed = new Date(`${value}-01T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? startOfIstMonth(now) : parsed;
}

const STATUS_LABEL: Record<FeeStatus, string> = {
  NOT_SET: "Fee missing",
  DUE: "Due",
  OVERDUE: "Overdue",
  PARTIAL: "Part paid",
  PAID: "Paid",
  CREDIT: "Credit",
};

export default async function FeesPage({
  params,
  searchParams,
}: {
  params: Promise<{ messId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { messId } = await params;
  const { role } = await requireMess(messId, "STAFF");
  if (role === "STAFF") redirect(`/mess/${messId}`);
  const query = await searchParams;
  const now = new Date();
  const month = parseMonth(query.month, now);
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 80) : "";
  const statusFilter = typeof query.status === "string" && query.status in STATUS_LABEL ? query.status as FeeStatus : null;
  const today = attendanceDay(now);

  const mess = await prisma.mess.findUnique({ where: { id: messId }, select: { dueDay: true } });
  if (!mess) redirect("/mess");
  const due = dueDate(month, mess.dueDay);
  const students = await prisma.student.findMany({
    where: { messId, ...onRollDuringWhere(month), ...(search ? { name: { contains: search, mode: "insensitive" } } : {}) },
    select: {
      id: true,
      name: true,
      parentPhone: true,
      monthlyFee: true,
      leftAt: true,
      payments: {
        where: { month },
        select: {
          id: true,
          amount: true,
          remindersSent: true,
          entries: { select: { kind: true, amount: true, reversedAt: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = students.map((student) => {
    const statement = student.payments[0] ?? null;
    const charge = statement?.amount ?? student.monthlyFee;
    const entries = statement?.entries ?? [];
    const balance = feeBalance(charge, entries);
    const hasPayment = entries.some((entry) => entry.kind === "PAYMENT" && !entry.reversedAt);
    const status = feeStatus({ charge, balance, due, today, hasPayment });
    const collected = entries.reduce((sum, entry) => {
      if (entry.reversedAt) return sum;
      if (entry.kind === "PAYMENT") return sum + entry.amount;
      if (entry.kind === "REFUND") return sum - entry.amount;
      return sum;
    }, 0);
    return { ...student, statementId: statement?.id ?? null, charge, balance, collected, status, remindersSent: statement?.remindersSent ?? 0 };
  });
  const filtered = statusFilter ? rows.filter((row) => row.status === statusFilter) : rows;
  const collected = rows.reduce((sum, row) => sum + row.collected, 0);
  const pending = rows.reduce((sum, row) => sum + Math.max(0, row.balance), 0);
  const overdue = rows.filter((row) => row.status === "OVERDUE").length;
  const prev = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() - 1, 1));
  const next = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
  const showNext = next.getTime() <= startOfIstMonth(now).getTime();
  const monthQuery = monthKey(month);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/mess/${messId}/fees?month=${monthKey(prev)}`} className="flex min-h-12 items-center rounded-xl border-2 border-border px-4 text-base font-medium text-text-muted hover:bg-muted">
          ← {monthLabel(prev).split(" ")[0]}
        </Link>
        <div className="text-center">
          <h1 className="font-heading text-xl font-bold text-text-main">Collections</h1>
          <p className="text-sm text-text-muted">{monthLabel(month)}</p>
        </div>
        {showNext ? (
          <Link href={`/mess/${messId}/fees?month=${monthKey(next)}`} className="flex min-h-12 items-center rounded-xl border-2 border-border px-4 text-base font-medium text-text-muted hover:bg-muted">
            {monthLabel(next).split(" ")[0]} →
          </Link>
        ) : <span className="w-20" />}
      </div>

      <section className="grid grid-cols-3 gap-3" aria-label="Collection totals">
        <Stat label="Received" value={money(collected)} />
        <Stat label="Outstanding" value={money(pending)} />
        <Stat label="Overdue" value={String(overdue)} alert={overdue > 0} />
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href={`/mess/${messId}/fees/reminders?month=${monthQuery}`} className="inline-flex min-h-11 items-center rounded-xl bg-primary-strong px-4 text-sm font-semibold text-white">Send reminders</Link>
        <Link href={`/api/mess/${messId}/collections?month=${monthQuery}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-border bg-white px-4 text-sm font-semibold text-text-main hover:bg-muted">
          <Download className="h-4 w-4" aria-hidden /> Export CSV
        </Link>
        <Link href={`/mess/${messId}/more/reports?month=${monthQuery}`} className="inline-flex min-h-11 items-center rounded-xl border-2 border-border bg-white px-4 text-sm font-semibold text-text-main hover:bg-muted">
          Print report
        </Link>
      </div>

      <form className="rounded-2xl border-2 border-border bg-white p-4" role="search">
        <input type="hidden" name="month" value={monthQuery} />
        <label htmlFor="collection-search" className="text-sm font-semibold text-text-main">Find a student</label>
        <div className="mt-2 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-3.5 left-3 h-5 w-5 text-text-muted" aria-hidden />
            <input id="collection-search" name="q" defaultValue={search} className="min-h-12 w-full rounded-xl border-2 border-border bg-white pr-3 pl-10 text-base text-text-main" placeholder="Type a name" />
          </div>
          <button className="min-h-12 rounded-xl bg-primary-strong px-5 text-base font-semibold text-white">Search</button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <Filter href={`/mess/${messId}/fees?month=${monthQuery}`} active={!statusFilter} label="All" />
          {(["OVERDUE", "PARTIAL", "DUE", "PAID", "NOT_SET"] as FeeStatus[]).map((status) => (
            <Filter key={status} href={`/mess/${messId}/fees?month=${monthQuery}&status=${status}`} active={statusFilter === status} label={STATUS_LABEL[status]} />
          ))}
        </div>
      </form>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border-2 border-border bg-white p-8 text-center text-base text-text-muted">No matching students.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((row) => (
            <li key={row.id}>
              <Link href={`/mess/${messId}/fees/${row.id}?month=${monthQuery}`} className="flex min-h-24 items-center justify-between gap-3 rounded-2xl border-2 border-border bg-white p-4 transition-colors hover:bg-muted">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-text-main">{row.name}{row.leftAt && <span className="ml-2 text-sm font-normal text-text-muted">left</span>}</p>
                  <p className="mt-1 text-base text-text-muted">{row.charge === null ? "No fee set" : `${money(row.balance)} left of ${money(row.charge)}`}</p>
                  <p className="mt-1 text-sm text-text-muted">{STATUS_LABEL[row.status]}{row.remindersSent ? ` · ${row.remindersSent} reminder${row.remindersSent === 1 ? "" : "s"}` : ""}{!row.parentPhone ? " · phone missing" : ""}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return <div className="rounded-2xl border-2 border-border bg-white p-3 sm:p-4"><p className={alert ? "font-heading text-xl font-bold tabular-nums text-red-800 sm:text-2xl" : "font-heading text-xl font-bold tabular-nums text-text-main sm:text-2xl"}>{value}</p><p className="mt-1 text-xs text-text-muted sm:text-sm">{label}</p></div>;
}

function Filter({ href, active, label }: { href: string; active: boolean; label: string }) {
  return <Link href={href} aria-current={active ? "page" : undefined} className={active ? "flex min-h-10 shrink-0 items-center rounded-full bg-text-main px-4 text-sm font-semibold text-white" : "flex min-h-10 shrink-0 items-center rounded-full bg-muted px-4 text-sm font-semibold text-text-muted"}>{label}</Link>;
}
