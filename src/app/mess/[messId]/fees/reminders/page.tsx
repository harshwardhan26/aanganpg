import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireMess } from "@/actions/mess";
import { startOfIstMonth } from "@/lib/mess";
import { feeBalance } from "@/lib/mess-finance";
import { BulkReminderForm } from "./BulkReminderForm";

export const metadata = { title: "Bulk fee reminders" };

export default async function ReminderPage({ params, searchParams }: { params: Promise<{ messId: string }>; searchParams: Promise<{ month?: string }> }) {
  const { messId } = await params;
  const { role } = await requireMess(messId, "STAFF");
  if (role === "STAFF") redirect(`/mess/${messId}`);
  const raw = (await searchParams).month;
  const monthValue = raw && /^\d{4}-\d{2}$/.test(raw) ? raw : startOfIstMonth(new Date()).toISOString().slice(0, 7);
  const month = new Date(`${monthValue}-01T00:00:00.000Z`);
  const records = await prisma.student.findMany({ where: { messId, leftAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, parentPhone: true, monthlyFee: true, payments: { where: { month }, select: { amount: true, entries: { select: { kind: true, amount: true, reversedAt: true } } } } } });
  const students = records.map((student) => { const statement = student.payments[0]; const balance = feeBalance(statement?.amount ?? student.monthlyFee, statement?.entries ?? []); return { id: student.id, name: student.name, amount: Math.max(0, balance), canSend: balance > 0 && Boolean(student.parentPhone) && student.monthlyFee !== null }; }).filter((student) => student.amount > 0);
  return <div><Link href={`/mess/${messId}/fees?month=${monthValue}`} className="inline-flex min-h-11 items-center font-semibold text-primary-strong">← Collections</Link><h1 className="mt-2 font-heading text-3xl font-bold text-text-main">Send reminders</h1><p className="mt-1 text-base text-text-muted">Choose up to 100 students. Every attempt is recorded, including gateway failures.</p><div className="mt-5"><BulkReminderForm messId={messId} month={monthValue} students={students} /></div></div>;
}
