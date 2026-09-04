"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireMess } from "@/actions/mess";
import { slidingLimiter, allowRequest } from "@/lib/rate-limit";
import { feeBalance, receiptNumber } from "@/lib/mess-finance";
import { monthLabel, MANUAL_REMINDER_COOLDOWN_HOURS } from "@/lib/mess";
import { overdueMessage, sendSms } from "@/lib/sms";

const writeLimiter = slidingLimiter(120, "1 m");
const id = z.string().trim().min(1).max(64);
const monthPattern = z.string().regex(/^\d{4}-\d{2}-01$/);

export type FinanceResult =
  | { ok: true; message: string; issues?: never }
  | { ok: false; issues: string[]; message?: never };

async function logEvent(
  tx: Prisma.TransactionClient,
  input: {
    messId: string;
    actorUserId: string | null;
    kind: string;
    entityType: string;
    entityId?: string;
    summary: string;
    details?: Prisma.InputJsonValue;
  },
) {
  await tx.activityEvent.create({ data: input });
}

/**
 * Take this payment's reminder slot, or find it already taken.
 *
 * Reads and writes in one statement so that two taps arriving together cannot
 * both see an empty slot: whichever `UPDATE` runs second matches no row and
 * gets `count: 0`. Checking `lastReminderAt` first and writing it afterwards
 * would leave exactly the gap that texts a parent twice about money.
 *
 * Claiming before the send, rather than after, is the point — a claim that is
 * never used is released below.
 */
async function claimReminderSlot(paymentId: string, now: Date): Promise<boolean> {
  const cutoff = new Date(now.getTime() - MANUAL_REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000);
  const claimed = await prisma.payment.updateMany({
    where: {
      id: paymentId,
      OR: [{ lastReminderAt: null }, { lastReminderAt: { lte: cutoff } }],
    },
    data: { remindersSent: { increment: 1 }, lastReminderAt: now },
  });
  return claimed.count === 1;
}

/**
 * Hand the slot back after a send that never left.
 *
 * Same reasoning as the nightly job: a message the gateway refused must not
 * consume one of this month's reminders, or configuring the gateway would find
 * everyone "already reminded".
 */
async function releaseReminderSlot(paymentId: string, previous: Date | null): Promise<void> {
  await prisma.payment.update({
    where: { id: paymentId },
    data: { remindersSent: { decrement: 1 }, lastReminderAt: previous },
  });
}

function parseAmount(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!/^\d+$/.test(value)) return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount > 0 && amount <= 1_000_000 ? amount : null;
}

export async function recordFeeEntry(
  _previous: FinanceResult,
  formData: FormData,
): Promise<FinanceResult> {
  const parsed = z.object({
    messId: id,
    studentId: id,
    month: monthPattern,
    kind: z.enum(["PAYMENT", "REFUND", "DISCOUNT", "EXTRA_CHARGE", "CREDIT"]),
    method: z.enum(["CASH", "UPI", "BANK", "OTHER"]).optional(),
    externalReference: z.string().trim().max(100).optional().default(""),
    note: z.string().trim().max(300).optional().default(""),
  }).safeParse({
    messId: formData.get("messId"),
    studentId: formData.get("studentId"),
    month: formData.get("month"),
    kind: formData.get("kind"),
    method: formData.get("method") || undefined,
    externalReference: formData.get("externalReference") ?? "",
    note: formData.get("note") ?? "",
  });
  const amount = parseAmount(formData.get("amount"));
  if (!parsed.success || amount === null) {
    return { ok: false, issues: ["Enter a valid amount and choose what was recorded."] };
  }

  const input = parsed.data;
  if (input.kind === "PAYMENT" && !input.method) {
    return { ok: false, issues: ["Choose cash, UPI, bank, or other for a payment."] };
  }
  if (input.method === "UPI" && !input.externalReference) {
    return { ok: false, issues: ["Add the UPI reference so this payment can be reconciled."] };
  }

  const { userId } = await requireMess(input.messId, "OWNER");
  if (!(await allowRequest(writeLimiter, `mess:fee-entry:${userId}`))) {
    return { ok: false, issues: ["Too many changes at once. Wait a minute and try again."] };
  }

  const student = await prisma.student.findFirst({
    where: { id: input.studentId, messId: input.messId },
    select: { id: true, name: true, monthlyFee: true },
  });
  if (!student) return { ok: false, issues: ["Student not found."] };

  const month = new Date(`${input.month}T00:00:00.000Z`);
  try {
    const created = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.upsert({
        where: { studentId_month: { studentId: student.id, month } },
        create: { studentId: student.id, month, amount: student.monthlyFee },
        update: {},
      });

      let receipt: string | null = null;
      if (input.kind === "PAYMENT") {
        const mess = await tx.mess.update({
          where: { id: input.messId },
          data: { receiptCounter: { increment: 1 } },
          select: { receiptCounter: true },
        });
        receipt = receiptNumber(mess.receiptCounter, new Date());
      }

      const reference = input.externalReference.toUpperCase() || null;
      const entry = await tx.paymentEntry.create({
        data: {
          paymentId: payment.id,
          messId: input.messId,
          kind: input.kind,
          amount,
          method: input.kind === "PAYMENT" ? input.method : null,
          externalReference: reference,
          // The same value, and the one the unique index watches. Reversing the
          // entry clears this and leaves `externalReference` alone.
          activeReference: reference,
          receiptNumber: receipt,
          note: input.note || null,
          createdById: userId,
        },
      });
      const activeEntries = await tx.paymentEntry.findMany({
        where: { paymentId: payment.id },
        select: { kind: true, amount: true, reversedAt: true },
      });
      const balance = feeBalance(payment.amount, activeEntries);
      await tx.payment.update({
        where: { id: payment.id },
        data: { paidAt: balance <= 0 ? new Date() : null },
      });
      await logEvent(tx, {
        messId: input.messId,
        actorUserId: userId,
        kind: `FEE_${input.kind}`,
        entityType: "PaymentEntry",
        entityId: entry.id,
        summary: `${input.kind === "PAYMENT" ? "Recorded" : "Added"} ${input.kind.toLowerCase().replace("_", " ")} of ₹${amount.toLocaleString("en-IN")} for ${student.name}`,
        details: { studentId: student.id, paymentId: payment.id, month: input.month, balance },
      });
      return { receipt, balance };
    }, { isolationLevel: "Serializable" });

    revalidatePath(`/mess/${input.messId}/fees`);
    revalidatePath(`/mess/${input.messId}/fees/${student.id}`);
    revalidatePath(`/my-mess/${input.messId}/payment`);
    return {
      ok: true,
      message: created.receipt
        ? `Payment saved. Receipt ${created.receipt} is ready.`
        : `${input.kind.toLowerCase().replace("_", " ")} saved.`,
    };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return { ok: false, issues: ["That reference number is already attached to another payment."] };
    }
    throw error;
  }
}

export async function reverseFeeEntry(formData: FormData): Promise<void> {
  const input = z.object({
    messId: id,
    entryId: id,
    reason: z.string().trim().min(3).max(300),
  }).parse({
    messId: formData.get("messId"),
    entryId: formData.get("entryId"),
    reason: formData.get("reason"),
  });
  const { userId } = await requireMess(input.messId, "OWNER");
  if (!(await allowRequest(writeLimiter, `mess:fee-reverse:${userId}`))) throw new Error("Too many requests");

  await prisma.$transaction(async (tx) => {
    const entry = await tx.paymentEntry.findFirst({
      where: { id: input.entryId, messId: input.messId },
      include: { payment: { select: { id: true, amount: true, studentId: true } } },
    });
    if (!entry || entry.reversedAt) throw new Error("Entry not found or already reversed");
    await tx.paymentEntry.update({
      where: { id: entry.id },
      // `activeReference` goes, `externalReference` stays: the record of what
      // was typed survives, but the reference is free to be used again on the
      // entry that should have carried it.
      data: { reversedAt: new Date(), reversedById: userId, reversalReason: input.reason, activeReference: null },
    });
    const entries = await tx.paymentEntry.findMany({
      where: { paymentId: entry.paymentId },
      select: { kind: true, amount: true, reversedAt: true },
    });
    const balance = feeBalance(entry.payment.amount, entries);
    await tx.payment.update({ where: { id: entry.paymentId }, data: { paidAt: balance <= 0 ? new Date() : null } });
    await logEvent(tx, {
      messId: input.messId,
      actorUserId: userId,
      kind: "FEE_ENTRY_REVERSED",
      entityType: "PaymentEntry",
      entityId: entry.id,
      summary: `Reversed ${entry.kind.toLowerCase().replace("_", " ")} of ₹${entry.amount.toLocaleString("en-IN")}`,
      details: { reason: input.reason, paymentId: entry.paymentId, balance },
    });
    // Serializable, to match `recordFeeEntry`. At the default isolation two
    // reversals of one entry arriving together both read `reversedAt` as null
    // and both write the audit line, leaving one reversal recorded twice.
  }, { isolationLevel: "Serializable" });
  revalidatePath(`/mess/${input.messId}/fees`);
}

export async function sendFeeReminder(
  _previous: FinanceResult,
  formData: FormData,
): Promise<FinanceResult> {
  const input = z.object({ messId: id, paymentId: id }).safeParse({
    messId: formData.get("messId"),
    paymentId: formData.get("paymentId"),
  });
  if (!input.success) return { ok: false, issues: ["This fee record could not be found."] };
  const { userId } = await requireMess(input.data.messId, "OWNER");
  // The per-payment cooldown below stops one parent being texted twice, but it
  // does not cap how many different parents one session can text in a minute.
  // This is the only unlimited action that spends money on every call.
  if (!(await allowRequest(writeLimiter, `mess:fee-reminder:${userId}`))) {
    return { ok: false, issues: ["Too many reminders at once. Wait a minute and try again."] };
  }
  const payment = await prisma.payment.findFirst({
    where: { id: input.data.paymentId, student: { messId: input.data.messId } },
    select: {
      id: true,
      amount: true,
      month: true,
      lastReminderAt: true,
      entries: { select: { kind: true, amount: true, reversedAt: true } },
      student: { select: { name: true, parentPhone: true, mess: { select: { name: true } } } },
    },
  });
  if (!payment) return { ok: false, issues: ["This fee record could not be found."] };
  if (!payment.student.parentPhone) return { ok: false, issues: ["Add a parent phone number before sending a reminder."] };
  const balance = feeBalance(payment.amount, payment.entries);
  if (balance <= 0) return { ok: false, issues: ["This fee is already settled."] };

  const now = new Date();
  if (!(await claimReminderSlot(payment.id, now))) {
    return { ok: false, issues: [`A reminder for this fee already went out. Wait ${MANUAL_REMINDER_COOLDOWN_HOURS} hours before sending another.`] };
  }

  const text = overdueMessage({
    studentName: payment.student.name,
    amount: balance,
    monthLabel: monthLabel(payment.month),
    messName: payment.student.mess.name,
  });
  const result = await sendSms(payment.student.parentPhone, text);
  if (!result.sent) await releaseReminderSlot(payment.id, payment.lastReminderAt);
  await prisma.$transaction(async (tx) => {
    await tx.reminderDelivery.create({
      data: {
        messId: input.data.messId,
        paymentId: payment.id,
        channel: "SMS",
        target: payment.student.parentPhone!,
        status: result.sent ? "SENT" : "FAILED",
        error: result.sent ? null : result.reason,
        createdById: userId,
        sentAt: result.sent ? now : null,
      },
    });
    await logEvent(tx, {
      messId: input.data.messId,
      actorUserId: userId,
      kind: result.sent ? "REMINDER_SENT" : "REMINDER_FAILED",
      entityType: "Payment",
      entityId: payment.id,
      summary: `${result.sent ? "Sent" : "Could not send"} fee reminder for ${payment.student.name}`,
      details: { configured: result.sent ? true : result.configured },
    });
  });
  revalidatePath(`/mess/${input.data.messId}/fees`);
  return result.sent
    ? { ok: true, message: "Reminder sent." }
    : { ok: false, issues: [result.configured ? result.reason : "SMS is in dry-run mode until gateway settings are added."] };
}

export async function sendBulkFeeReminders(
  _previous: FinanceResult,
  formData: FormData,
): Promise<FinanceResult> {
  const parsed = z.object({ messId: id, month: monthPattern }).safeParse({ messId: formData.get("messId"), month: formData.get("month") });
  const studentIds = formData.getAll("studentId").map(String).filter((value) => id.safeParse(value).success).slice(0, 100);
  if (!parsed.success || studentIds.length === 0) return { ok: false, issues: ["Select at least one student."] };
  const { userId } = await requireMess(parsed.data.messId, "OWNER");
  if (!(await allowRequest(writeLimiter, `mess:bulk-reminder:${userId}`))) return { ok: false, issues: ["Too many reminder requests. Try again shortly."] };
  const month = new Date(`${parsed.data.month}T00:00:00.000Z`);
  const mess = await prisma.mess.findUnique({
    where: { id: parsed.data.messId },
    select: {
      name: true,
      students: {
        where: { id: { in: studentIds } },
        select: { id: true, name: true, parentPhone: true, monthlyFee: true, payments: { where: { month }, select: { id: true, amount: true, lastReminderAt: true, entries: { select: { kind: true, amount: true, reversedAt: true } } } } },
      },
    },
  });
  if (!mess) return { ok: false, issues: ["Mess not found."] };
  const now = new Date();
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let dryRun = false;
  for (const student of mess.students) {
    if (!student.parentPhone || student.monthlyFee === null) { failed++; continue; }
    const existing = student.payments[0] ?? null;
    const balance = feeBalance(existing?.amount ?? student.monthlyFee, existing?.entries ?? []);
    if (balance <= 0) continue;
    const statement = existing ?? await prisma.payment.create({ data: { studentId: student.id, month, amount: student.monthlyFee }, select: { id: true, lastReminderAt: true } });
    // Claimed one at a time rather than in a single bulk update, so a run that
    // dies halfway leaves the students it never reached still claimable.
    if (!(await claimReminderSlot(statement.id, now))) { skipped++; continue; }
    const result = await sendSms(student.parentPhone, overdueMessage({ studentName: student.name, amount: balance, monthLabel: monthLabel(month), messName: mess.name }));
    if (!result.sent) await releaseReminderSlot(statement.id, statement.lastReminderAt);
    await prisma.$transaction([
      prisma.reminderDelivery.create({ data: { messId: parsed.data.messId, paymentId: statement.id, channel: "SMS", target: student.parentPhone, status: result.sent ? "SENT" : "FAILED", error: result.sent ? null : result.reason, automated: false, createdById: userId, sentAt: result.sent ? now : null } }),
      prisma.activityEvent.create({ data: { messId: parsed.data.messId, actorUserId: userId, kind: result.sent ? "REMINDER_SENT" : "REMINDER_FAILED", entityType: "Payment", entityId: statement.id, summary: `${result.sent ? "Sent" : "Could not send"} fee reminder for ${student.name}` } }),
    ]);
    if (result.sent) sent++; else { failed++; if (!result.configured) dryRun = true; }
  }
  revalidatePath(`/mess/${parsed.data.messId}/fees`);
  const skippedNote = skipped ? ` ${skipped} already had a reminder in the last ${MANUAL_REMINDER_COOLDOWN_HOURS} hours.` : "";
  if (sent > 0) {
    return { ok: true, message: `Sent ${sent} reminder${sent === 1 ? "" : "s"}.${failed ? ` ${failed} could not be sent.` : ""}${skippedNote}` };
  }
  if (dryRun) return { ok: false, issues: ["SMS is in dry-run mode until gateway settings are added."] };
  if (skipped && !failed) return { ok: false, issues: [`Nothing sent.${skippedNote}`] };
  return { ok: false, issues: [`No reminders were sent. ${failed} record${failed === 1 ? "" : "s"} need attention.${skippedNote}`] };
}
