import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireMess } from "@/actions/mess";
import { csvField } from "@/lib/escape";
import { attendanceDay, dueDate, monthLabel, onRollDuringWhere, startOfIstMonth } from "@/lib/mess";
import { feeBalance, feeStatus } from "@/lib/mess-finance";

export async function GET(request: NextRequest, { params }: { params: Promise<{ messId: string }> }) {
  const { messId } = await params;
  const { role } = await requireMess(messId, "STAFF");
  if (role === "STAFF") return new Response("Forbidden", { status: 403 });
  const raw = request.nextUrl.searchParams.get("month");
  const month = raw && /^\d{4}-\d{2}$/.test(raw) ? new Date(`${raw}-01T00:00:00.000Z`) : startOfIstMonth(new Date());
  const mess = await prisma.mess.findUnique({ where: { id: messId }, select: { name: true, dueDay: true } });
  if (!mess) return new Response("Not found", { status: 404 });
  const students = await prisma.student.findMany({
    where: { messId, ...onRollDuringWhere(month) },
    orderBy: { name: "asc" },
    select: { name: true, email: true, parentPhone: true, monthlyFee: true, payments: { where: { month }, select: { amount: true, entries: { select: { kind: true, amount: true, method: true, externalReference: true, occurredAt: true, reversedAt: true } } } } },
  });
  const due = dueDate(month, mess.dueDay);
  const lines = [["Student", "Email", "Parent phone", "Month", "Charge", "Received", "Balance", "Status", "Methods", "References"]];
  for (const student of students) {
    const statement = student.payments[0] ?? null;
    const charge = statement?.amount ?? student.monthlyFee;
    const entries = statement?.entries ?? [];
    const balance = feeBalance(charge, entries);
    const payments = entries.filter((entry) => !entry.reversedAt && entry.kind === "PAYMENT");
    const received = payments.reduce((sum, entry) => sum + entry.amount, 0) - entries.filter((entry) => !entry.reversedAt && entry.kind === "REFUND").reduce((sum, entry) => sum + entry.amount, 0);
    const status = feeStatus({ charge, balance, due, today: attendanceDay(new Date()), hasPayment: payments.length > 0 });
    lines.push([student.name, student.email ?? "", student.parentPhone ?? "", monthLabel(month), String(charge ?? ""), String(received), String(balance), status, [...new Set(payments.map((entry) => entry.method ?? "OTHER"))].join("; "), payments.map((entry) => entry.externalReference).filter(Boolean).join("; ")]);
  }
  const body = lines.map((line) => line.map(csvField).join(",")).join("\r\n");
  return new Response(`\uFEFF${body}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${raw ?? "current"}-collections.csv"`, "Cache-Control": "private, no-store" } });
}
