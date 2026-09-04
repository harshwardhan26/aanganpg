import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { findStudent } from "@/actions/mess";
import { monthLabel } from "@/lib/mess";
import { FeeReceipt } from "@/components/mess/FeeReceipt";

export const metadata = { title: "My fee receipt" };

export default async function StudentReceiptPage({
  params,
}: {
  params: Promise<{ messId: string; entryId: string }>;
}) {
  const { messId, entryId } = await params;
  const student = await findStudent(messId);
  if (!student) redirect("/my-mess");
  const entry = await prisma.paymentEntry.findFirst({
    where: { id: entryId, messId, kind: "PAYMENT", payment: { studentId: student.id } },
    select: {
      receiptNumber: true,
      amount: true,
      method: true,
      externalReference: true,
      occurredAt: true,
      reversedAt: true,
      mess: { select: { name: true, address: true, contactPhone: true } },
      payment: { select: { month: true, student: { select: { name: true } } } },
    },
  });
  if (!entry?.receiptNumber) notFound();
  return (
    <main className="min-h-screen bg-light px-4 py-6 print:bg-white">
      <div className="mx-auto mb-5 max-w-xl print:hidden">
        <Link
          href={`/my-mess/${messId}/payment`}
          className="inline-flex min-h-11 items-center font-semibold text-primary-strong"
        >
          ← My fees
        </Link>
      </div>
      <FeeReceipt
        receipt={{
          receiptNumber: entry.receiptNumber,
          messName: entry.mess.name,
          messAddress: entry.mess.address,
          contactPhone: entry.mess.contactPhone,
          studentName: entry.payment.student.name,
          monthLabel: monthLabel(entry.payment.month),
          amount: entry.amount,
          method: entry.method,
          reference: entry.externalReference,
          receivedAt: entry.occurredAt,
          reversedAt: entry.reversedAt,
        }}
      />
      <p className="mx-auto mt-4 max-w-xl text-center text-sm text-text-muted print:hidden">
        Use your browser’s Print command to save a PDF.
      </p>
    </main>
  );
}
