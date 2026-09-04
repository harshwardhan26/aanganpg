import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireMessOwner } from "@/actions/mess";
import { monthKey, monthLabel, onRollDuringWhere, startOfIstMonth } from "@/lib/mess";
import { feeBalance, money } from "@/lib/mess-finance";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Monthly report" };

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ messId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { messId } = await params;
  await requireMessOwner(messId);
  const raw = (await searchParams).month;
  const month =
    raw && /^\d{4}-\d{2}$/.test(raw)
      ? new Date(`${raw}-01T00:00:00.000Z`)
      : startOfIstMonth(new Date());
  const [mess, students] = await Promise.all([
    prisma.mess.findUnique({ where: { id: messId }, select: { name: true, address: true } }),
    prisma.student.findMany({
      where: { messId, ...onRollDuringWhere(month) },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        monthlyFee: true,
        payments: {
          where: { month },
          select: {
            amount: true,
            entries: { select: { kind: true, amount: true, method: true, reversedAt: true } },
          },
        },
      },
    }),
  ]);
  if (!mess) redirect("/mess");
  const rows = students.map((student) => {
    const statement = student.payments[0];
    const charge = statement?.amount ?? student.monthlyFee;
    const entries = statement?.entries ?? [];
    return {
      id: student.id,
      name: student.name,
      charge: charge ?? 0,
      balance: feeBalance(charge, entries),
      received: entries.reduce(
        (sum, entry) =>
          entry.reversedAt
            ? sum
            : entry.kind === "PAYMENT"
              ? sum + entry.amount
              : entry.kind === "REFUND"
                ? sum - entry.amount
                : sum,
        0,
      ),
    };
  });
  const activeEntries = students
    .flatMap((student) => student.payments[0]?.entries ?? [])
    .filter((entry) => !entry.reversedAt);
  const byMethod = (["CASH", "UPI", "BANK", "OTHER"] as const).map((method) => ({
    method,
    amount: activeEntries
      .filter((entry) => entry.kind === "PAYMENT" && entry.method === method)
      .reduce((sum, entry) => sum + entry.amount, 0),
  }));
  const expected = rows.reduce((sum, row) => sum + row.charge, 0);
  const received = rows.reduce((sum, row) => sum + row.received, 0);
  const outstanding = rows.reduce((sum, row) => sum + Math.max(0, row.balance), 0);
  const value = monthKey(month);
  const prev = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() - 1, 1));
  const next = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
  return (
    <div className="print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text-main">Monthly report</h1>
          <p className="mt-1 text-base text-text-muted">
            What was expected, what came in, and what is still owed.
          </p>
        </div>
        <PrintButton />
      </div>
      <header className="mt-6 border-b-2 border-text-main pb-4">
        <p className="text-sm font-bold uppercase tracking-wide text-primary-strong">
          Aangan Mess report
        </p>
        <h2 className="font-heading text-3xl font-bold text-text-main">{mess.name}</h2>
        <p className="text-base text-text-muted">
          {monthLabel(month)}
          {mess.address ? ` · ${mess.address}` : ""}
        </p>
      </header>
      <nav className="mt-4 flex items-center justify-between print:hidden">
        <Link
          href={`?month=${monthKey(prev)}`}
          className="min-h-11 rounded-xl border-2 border-border px-4 py-2 font-semibold text-text-main"
        >
          ← {monthLabel(prev).split(" ")[0]}
        </Link>
        <Link
          href={`?month=${monthKey(next)}`}
          className="min-h-11 rounded-xl border-2 border-border px-4 py-2 font-semibold text-text-main"
        >
          {monthLabel(next).split(" ")[0]} →
        </Link>
      </nav>
      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Expected" value={money(expected)} />
        <Stat label="Received" value={money(received)} />
        <Stat label="Outstanding" value={money(outstanding)} />
      </section>
      <section className="mt-6">
        <h2 className="font-heading text-xl font-bold text-text-main">Reconciliation</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {byMethod.map((item) => (
            <div key={item.method} className="rounded-xl border border-border bg-white p-3">
              <dt className="text-xs font-semibold text-text-muted">{item.method}</dt>
              <dd className="mt-1 font-heading text-xl font-bold text-text-main">
                {money(item.amount)}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="mt-6 overflow-x-auto">
        <h2 className="font-heading text-xl font-bold text-text-main">Student balances</h2>
        <table className="mt-3 w-full min-w-[32rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-text-main">
              <th className="p-2">Student</th>
              <th className="p-2 text-right">Fee</th>
              <th className="p-2 text-right">Received</th>
              <th className="p-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border">
                <td className="p-2 font-medium">{row.name}</td>
                <td className="p-2 text-right">{money(row.charge)}</td>
                <td className="p-2 text-right">{money(row.received)}</td>
                <td className="p-2 text-right font-semibold">{money(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="mt-6 text-xs text-text-muted">
        Generated from Aangan records for {value}. Aangan records off-platform payments and does not
        hold funds.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-border bg-white p-4">
      <p className="font-heading text-xl font-bold text-text-main">{value}</p>
      <p className="mt-1 text-sm text-text-muted">{label}</p>
    </div>
  );
}
