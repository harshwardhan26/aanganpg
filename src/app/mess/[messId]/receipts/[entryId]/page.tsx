import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireMess } from "@/actions/mess";
import { monthLabel } from "@/lib/mess";
import { FeeReceipt } from "@/components/mess/FeeReceipt";

export const metadata = { title: "Fee receipt" };

export default async function OwnerReceiptPage({ params }: { params: Promise<{ messId: string; entryId: string }> }) {
  const { messId, entryId } = await params;
  const { role } = await requireMess(messId, "STAFF");
  if (role === "STAFF") redirect(`/mess/${messId}`);
  const entry = await prisma.paymentEntry.findFirst({
    where: { id: entryId, messId, kind: "PAYMENT" },
    select: {
      receiptNumber: true, amount: true, method: true, externalReference: true, occurredAt: true, reversedAt: true,
      mess: { select: { name: true, address: true, contactPhone: true } },
      payment: { select: { month: true, student: { select: { name: true } } } },
    },
  });
  if (!entry?.receiptNumber) notFound();
  const receipt = { receiptNumber: entry.receiptNumber, messName: entry.mess.name, messAddress: entry.mess.address, contactPhone: entry.mess.contactPhone, studentName: entry.payment.student.name, monthLabel: monthLabel(entry.payment.month), amount: entry.amount, method: entry.method, reference: entry.externalReference, receivedAt: entry.occurredAt, reversedAt: entry.reversedAt };
  return <div className="print:bg-white"><div className="mb-5 print:hidden"><Link href={`/mess/${messId}/fees`} className="inline-flex min-h-11 items-center font-semibold text-primary-strong">← Collections</Link></div><FeeReceipt receipt={receipt} /><p className="mt-4 text-center text-sm text-text-muted print:hidden">Use your browser’s Print command to save this as PDF or share a paper copy.</p></div>;
}
