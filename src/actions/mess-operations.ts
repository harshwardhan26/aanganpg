"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { findStudent, requireMess } from "@/actions/mess";
import { canChangeMealSkip } from "@/lib/mess";
import { slidingLimiter, allowRequest } from "@/lib/rate-limit";

const id = z.string().trim().min(1).max(64);
const dayPattern = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const limiter = slidingLimiter(120, "1 m");

export type OperationsResult =
  | { ok: true; message: string; issues?: never }
  | { ok: false; issues: string[]; message?: never };

function positiveInt(value: FormDataEntryValue | null, max = 10_000_000): number | null {
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= max ? parsed : null;
}

export async function setMealSkip(
  _previous: OperationsResult,
  formData: FormData,
): Promise<OperationsResult> {
  const parsed = z.object({
    messId: id,
    day: dayPattern,
    meal: z.enum(["BREAKFAST", "LUNCH", "DINNER"]),
    skipped: z.enum(["true", "false"]),
    note: z.string().trim().max(200).optional().default(""),
  }).safeParse({
    messId: formData.get("messId"),
    day: formData.get("day"),
    meal: formData.get("meal"),
    skipped: formData.get("skipped"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { ok: false, issues: ["Choose a valid date and meal."] };
  const student = await findStudent(parsed.data.messId);
  if (!student || student.leftAt) return { ok: false, issues: ["You are not active in this mess."] };
  if (!(await allowRequest(limiter, `mess:skip:${student.id}`))) return { ok: false, issues: ["Too many changes at once. Try again shortly."] };
  const mess = await prisma.mess.findUnique({ where: { id: parsed.data.messId }, select: { skipCutoffMinutes: true } });
  if (!mess) return { ok: false, issues: ["Mess not found."] };
  const day = new Date(`${parsed.data.day}T00:00:00.000Z`);
  if (!canChangeMealSkip(day, mess.skipCutoffMinutes, new Date())) {
    return { ok: false, issues: ["The cut-off for changing this meal has passed."] };
  }
  if (parsed.data.skipped === "true") {
    await prisma.mealSkip.upsert({
      where: { studentId_day_meal: { studentId: student.id, day, meal: parsed.data.meal } },
      create: { messId: parsed.data.messId, studentId: student.id, day, meal: parsed.data.meal, note: parsed.data.note || null },
      update: { note: parsed.data.note || null },
    });
  } else {
    await prisma.mealSkip.deleteMany({ where: { studentId: student.id, day, meal: parsed.data.meal } });
  }
  revalidatePath(`/my-mess/${parsed.data.messId}`);
  revalidatePath(`/my-mess/${parsed.data.messId}/skip`);
  revalidatePath(`/mess/${parsed.data.messId}/more/kitchen`);
  return { ok: true, message: parsed.data.skipped === "true" ? "Meal marked as skipped." : "Meal added back." };
}

export async function saveKitchenLog(
  _previous: OperationsResult,
  formData: FormData,
): Promise<OperationsResult> {
  const parsed = z.object({
    messId: id,
    day: dayPattern,
    meal: z.enum(["BREAKFAST", "LUNCH", "DINNER"]),
    note: z.string().trim().max(300).optional().default(""),
  }).safeParse({ messId: formData.get("messId"), day: formData.get("day"), meal: formData.get("meal"), note: formData.get("note") ?? "" });
  const preparedCount = positiveInt(formData.get("preparedCount"), 10_000);
  const leftoverCount = positiveInt(formData.get("leftoverCount"), 10_000);
  if (!parsed.success || preparedCount === null || leftoverCount === null || leftoverCount > preparedCount) {
    return { ok: false, issues: ["Enter valid prepared and leftover counts. Leftovers cannot exceed prepared meals."] };
  }
  const { userId } = await requireMess(parsed.data.messId, "STAFF");
  if (!(await allowRequest(limiter, `mess:kitchen:${userId}`))) return { ok: false, issues: ["Too many changes. Try again shortly."] };
  const day = new Date(`${parsed.data.day}T00:00:00.000Z`);
  const log = await prisma.kitchenLog.upsert({
    where: { messId_day_meal: { messId: parsed.data.messId, day, meal: parsed.data.meal } },
    create: { messId: parsed.data.messId, day, meal: parsed.data.meal, preparedCount, leftoverCount, note: parsed.data.note || null, updatedById: userId },
    update: { preparedCount, leftoverCount, note: parsed.data.note || null, updatedById: userId },
  });
  await prisma.activityEvent.create({
    data: {
      messId: parsed.data.messId,
      actorUserId: userId,
      kind: "KITCHEN_LOG_SAVED",
      entityType: "KitchenLog",
      entityId: log.id,
      summary: `Recorded ${preparedCount} prepared and ${leftoverCount} leftover ${parsed.data.meal.toLowerCase()} meals`,
    },
  });
  revalidatePath(`/mess/${parsed.data.messId}/more/kitchen`);
  return { ok: true, message: "Kitchen numbers saved." };
}

export async function saveNotice(
  _previous: OperationsResult,
  formData: FormData,
): Promise<OperationsResult> {
  const parsed = z.object({
    messId: id,
    title: z.string().trim().min(2).max(100),
    body: z.string().trim().min(2).max(1000),
    audience: z.enum(["ALL", "STUDENTS", "STAFF"]),
    expiresOn: z.union([dayPattern, z.literal("")]).optional().default(""),
  }).safeParse({
    messId: formData.get("messId"),
    title: formData.get("title"),
    body: formData.get("body"),
    audience: formData.get("audience"),
    expiresOn: formData.get("expiresOn") ?? "",
  });
  if (!parsed.success) return { ok: false, issues: ["Add a title, message, audience, and valid expiry date."] };
  const { userId } = await requireMess(parsed.data.messId, "OWNER");
  if (!(await allowRequest(limiter, `mess:notice:${userId}`))) return { ok: false, issues: ["Too many notices at once. Try again shortly."] };
  const notice = await prisma.notice.create({
    data: {
      messId: parsed.data.messId,
      title: parsed.data.title,
      body: parsed.data.body,
      audience: parsed.data.audience,
      expiresAt: parsed.data.expiresOn ? new Date(`${parsed.data.expiresOn}T18:29:59.999Z`) : null,
      createdById: userId,
    },
  });
  await prisma.activityEvent.create({
    data: { messId: parsed.data.messId, actorUserId: userId, kind: "NOTICE_CREATED", entityType: "Notice", entityId: notice.id, summary: `Published notice: ${notice.title}` },
  });
  revalidatePath(`/mess/${parsed.data.messId}/more/notices`);
  revalidatePath(`/my-mess/${parsed.data.messId}`);
  return { ok: true, message: "Notice published." };
}

export async function deleteNotice(formData: FormData): Promise<void> {
  const input = z.object({ messId: id, noticeId: id }).parse({ messId: formData.get("messId"), noticeId: formData.get("noticeId") });
  const { userId } = await requireMess(input.messId, "OWNER");
  if (!(await allowRequest(limiter, `mess:notice:${userId}`))) throw new Error("Too many requests");
  const notice = await prisma.notice.findFirst({ where: { id: input.noticeId, messId: input.messId }, select: { id: true, title: true } });
  if (!notice) throw new Error("Notice not found");
  await prisma.$transaction([
    prisma.notice.delete({ where: { id: notice.id } }),
    prisma.activityEvent.create({ data: { messId: input.messId, actorUserId: userId, kind: "NOTICE_REMOVED", entityType: "Notice", entityId: notice.id, summary: `Removed notice: ${notice.title}` } }),
  ]);
  revalidatePath(`/mess/${input.messId}/more/notices`);
}

export async function submitMessFeedback(
  _previous: OperationsResult,
  formData: FormData,
): Promise<OperationsResult> {
  const parsed = z.object({
    messId: id,
    category: z.enum(["FOOD", "CLEANLINESS", "SERVICE", "BILLING", "OTHER"]),
    rating: z.union([z.coerce.number().int().min(1).max(5), z.literal("")]).optional(),
    message: z.string().trim().min(3).max(1000),
  }).safeParse({ messId: formData.get("messId"), category: formData.get("category"), rating: formData.get("rating") ?? "", message: formData.get("message") });
  if (!parsed.success) return { ok: false, issues: ["Choose a category and write at least a few words."] };
  const student = await findStudent(parsed.data.messId);
  if (!student || student.leftAt) return { ok: false, issues: ["You are not active in this mess."] };
  if (!(await allowRequest(limiter, `mess:feedback:${student.id}`))) return { ok: false, issues: ["Too many messages at once. Try again shortly."] };
  await prisma.messFeedback.create({ data: { messId: parsed.data.messId, studentId: student.id, category: parsed.data.category, rating: typeof parsed.data.rating === "number" ? parsed.data.rating : null, message: parsed.data.message } });
  revalidatePath(`/my-mess/${parsed.data.messId}/feedback`);
  revalidatePath(`/mess/${parsed.data.messId}/more/feedback`);
  return { ok: true, message: "Feedback sent privately to the mess owner." };
}

export async function respondToFeedback(
  _previous: OperationsResult,
  formData: FormData,
): Promise<OperationsResult> {
  const parsed = z.object({ messId: id, feedbackId: id, response: z.string().trim().min(2).max(1000), resolved: z.enum(["true", "false"]) }).safeParse({
    messId: formData.get("messId"), feedbackId: formData.get("feedbackId"), response: formData.get("response"), resolved: formData.get("resolved"),
  });
  if (!parsed.success) return { ok: false, issues: ["Write a response and choose whether the issue is resolved."] };
  const { userId } = await requireMess(parsed.data.messId, "OWNER");
  if (!(await allowRequest(limiter, `mess:feedback-reply:${userId}`))) return { ok: false, issues: ["Too many replies at once. Try again shortly."] };
  const updated = await prisma.messFeedback.updateMany({
    where: { id: parsed.data.feedbackId, messId: parsed.data.messId },
    data: {
      ownerResponse: parsed.data.response,
      status: parsed.data.resolved === "true" ? "RESOLVED" : "OPEN",
      resolvedAt: parsed.data.resolved === "true" ? new Date() : null,
      resolvedById: parsed.data.resolved === "true" ? userId : null,
    },
  });
  if (!updated.count) return { ok: false, issues: ["Feedback not found."] };
  await prisma.activityEvent.create({ data: { messId: parsed.data.messId, actorUserId: userId, kind: "FEEDBACK_RESPONDED", entityType: "MessFeedback", entityId: parsed.data.feedbackId, summary: parsed.data.resolved === "true" ? "Responded to and resolved feedback" : "Responded to feedback" } });
  revalidatePath(`/mess/${parsed.data.messId}/more/feedback`);
  revalidatePath(`/my-mess/${parsed.data.messId}/feedback`);
  return { ok: true, message: "Response saved." };
}

export async function correctAttendance(formData: FormData): Promise<void> {
  const input = z.object({
    messId: id,
    studentId: id,
    day: dayPattern,
    meal: z.enum(["BREAKFAST", "LUNCH", "DINNER"]),
    present: z.enum(["true", "false"]),
    reason: z.string().trim().min(3).max(300),
  }).parse({
    messId: formData.get("messId"), studentId: formData.get("studentId"), day: formData.get("day"), meal: formData.get("meal"), present: formData.get("present"), reason: formData.get("reason"),
  });
  const { userId } = await requireMess(input.messId, "OWNER");
  if (!(await allowRequest(limiter, `mess:attendance-fix:${userId}`))) throw new Error("Too many requests");
  const student = await prisma.student.findFirst({ where: { id: input.studentId, messId: input.messId }, select: { id: true, name: true } });
  if (!student) throw new Error("Student not found");
  const day = new Date(`${input.day}T00:00:00.000Z`);
  await prisma.$transaction(async (tx) => {
    if (input.present === "true") {
      await tx.attendance.upsert({
        where: { studentId_day_meal: { studentId: student.id, day, meal: input.meal } },
        create: { studentId: student.id, day, meal: input.meal, method: "MANUAL" },
        update: {},
      });
    } else {
      await tx.attendance.deleteMany({ where: { studentId: student.id, day, meal: input.meal } });
    }
    await tx.activityEvent.create({
      data: {
        messId: input.messId,
        actorUserId: userId,
        kind: "ATTENDANCE_CORRECTED",
        entityType: "Attendance",
        entityId: student.id,
        summary: `${input.present === "true" ? "Added" : "Removed"} ${input.meal.toLowerCase()} attendance for ${student.name}`,
        details: { day: input.day, meal: input.meal, present: input.present === "true", reason: input.reason },
      },
    });
  });
  revalidatePath(`/mess/${input.messId}/checkin`);
  revalidatePath(`/mess/${input.messId}/more/activity`);
}
