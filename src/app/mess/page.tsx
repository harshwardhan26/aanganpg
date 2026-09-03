import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { startOfIstMonth } from "@/lib/mess";
import { feeBalance, money } from "@/lib/mess-finance";

export const metadata = { title: "Mess portfolio" };

export default async function MessIndex() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect("/");
  const isAdmin = session?.user?.role === "admin";
  const month = startOfIstMonth(new Date());
  const messes = await prisma.mess.findMany({
    where: isAdmin ? {} : { members: { some: { userId } } },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, subscriptionPlan: true, subscriptionStatus: true,
      students: { where: { leftAt: null }, select: { id: true, monthlyFee: true, payments: { where: { month }, select: { amount: true, entries: { select: { kind: true, amount: true, reversedAt: true } } } } } },
      feedback: { where: { status: "OPEN" }, select: { id: true } },
    },
  });
  if (messes.length === 1) redirect(`/mess/${messes[0].id}`);
  return <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6"><h1 className="font-heading text-3xl font-bold text-text-main">Your messes</h1><p className="mt-1 text-base text-text-muted">A portfolio view for owners operating more than one location.</p>{messes.length === 0 ? <p className="mt-5 rounded-2xl border-2 border-border bg-white p-6 text-text-muted">This account is not attached to any mess yet. Ask Aangan to add you.</p> : <ul className="mt-6 grid gap-4 sm:grid-cols-2">{messes.map((mess) => { const outstanding = mess.students.reduce((sum, student) => { const statement = student.payments[0]; return sum + Math.max(0, feeBalance(statement?.amount ?? student.monthlyFee, statement?.entries ?? [])); }, 0); return <li key={mess.id}><Link href={`/mess/${mess.id}`} className="block rounded-2xl border-2 border-border bg-white p-5 transition-colors hover:bg-muted"><div className="flex items-start justify-between gap-3"><h2 className="font-heading text-xl font-bold text-text-main">{mess.name}</h2><span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-text-muted">{mess.subscriptionPlan}</span></div><dl className="mt-5 grid grid-cols-3 gap-2"><Stat label="Students" value={String(mess.students.length)} /><Stat label="Outstanding" value={money(outstanding)} alert={outstanding > 0} /><Stat label="Open issues" value={String(mess.feedback.length)} alert={mess.feedback.length > 0} /></dl><p className="mt-4 text-sm font-semibold text-primary-strong">Open dashboard →</p></Link></li>; })}</ul>}</main>;
}

function Stat({ label, value, alert }: { label: string; value: string; alert?: boolean }) { return <div className="rounded-xl bg-light p-3"><dt className="text-xs text-text-muted">{label}</dt><dd className={alert ? "mt-1 break-words font-heading text-lg font-bold text-red-800" : "mt-1 break-words font-heading text-lg font-bold text-text-main"}>{value}</dd></div>; }
