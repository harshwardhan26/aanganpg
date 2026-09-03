"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { requireMess } from "@/actions/mess";
import { canonicalPhone } from "@/lib/phone";
import { fromClockValue, studentFormIssues } from "@/lib/mess";
import { parseStudentCsv } from "@/lib/csv-import";
import { slidingLimiter, allowRequest } from "@/lib/rate-limit";

const id = z.string().trim().min(1).max(64);
const writeLimiter = slidingLimiter(60, "1 m");

export type SettingsResult =
  | { ok: true; message: string; inviteUrl?: string; issues?: never }
  | { ok: false; issues: string[]; message?: never; inviteUrl?: never };

function fee(raw: string): number | null {
  if (!raw.trim()) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 && value <= 100_000 ? value : null;
}

export async function saveMessSetup(
  _previous: SettingsResult,
  formData: FormData,
): Promise<SettingsResult> {
  const parsed = z.object({
    messId: id,
    name: z.string().trim().min(2).max(100),
    address: z.string().trim().max(300).optional().default(""),
    contactPhone: z.string().trim().max(20).optional().default(""),
    dueDay: z.coerce.number().int().min(1).max(31),
    skipCutoff: z.string().trim(),
  }).safeParse({
    messId: formData.get("messId"),
    name: formData.get("name"),
    address: formData.get("address") ?? "",
    contactPhone: formData.get("contactPhone") ?? "",
    dueDay: formData.get("dueDay"),
    skipCutoff: formData.get("skipCutoff"),
  });
  if (!parsed.success) return { ok: false, issues: ["Check the mess name, due date, and skip cut-off."] };
  const phone = canonicalPhone(parsed.data.contactPhone);
  if (parsed.data.contactPhone && !phone) return { ok: false, issues: ["Contact phone is not a valid Indian mobile number."] };
  const cutoff = fromClockValue(parsed.data.skipCutoff);
  if (cutoff === null) return { ok: false, issues: ["Choose a valid meal-skip cut-off time."] };
  const { userId } = await requireMess(parsed.data.messId, "OWNER");
  if (!(await allowRequest(writeLimiter, `mess:setup:${userId}`))) return { ok: false, issues: ["Too many changes. Try again shortly."] };
  const existing = await prisma.mess.findUnique({ where: { id: parsed.data.messId }, select: { trialEndsAt: true } });
  if (!existing) return { ok: false, issues: ["Mess not found."] };
  await prisma.$transaction([
    prisma.mess.update({
      where: { id: parsed.data.messId },
      data: {
        name: parsed.data.name,
        address: parsed.data.address || null,
        contactPhone: phone,
        dueDay: parsed.data.dueDay,
        skipCutoffMinutes: cutoff,
        setupCompletedAt: new Date(),
        trialEndsAt: existing.trialEndsAt ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.activityEvent.create({
      data: {
        messId: parsed.data.messId,
        actorUserId: userId,
        kind: "MESS_SETUP_UPDATED",
        entityType: "Mess",
        entityId: parsed.data.messId,
        summary: "Updated mess setup",
      },
    }),
  ]);
  revalidatePath(`/mess/${parsed.data.messId}`);
  revalidatePath(`/mess/${parsed.data.messId}/more/setup`);
  return { ok: true, message: "Mess setup saved." };
}

export async function importStudents(
  _previous: SettingsResult,
  formData: FormData,
): Promise<SettingsResult> {
  const messId = id.safeParse(formData.get("messId"));
  const file = formData.get("file");
  if (!messId.success || !(file instanceof File) || file.size === 0 || file.size > 1_000_000) {
    return { ok: false, issues: ["Choose a CSV file smaller than 1 MB."] };
  }
  const { userId } = await requireMess(messId.data, "OWNER");
  const parsed = parseStudentCsv(await file.text());
  if (parsed.rows.length > 1_000) return { ok: false, issues: ["Import at most 1,000 students at a time."] };
  const issues = [...parsed.issues];
  const data = parsed.rows.flatMap((row, index) => {
    const parentPhone = canonicalPhone(row.parentPhone);
    const monthlyFee = fee(row.monthlyFee);
    const rowIssues = studentFormIssues({
      name: row.name,
      email: row.email,
      parentPhone,
      parentPhoneRaw: row.parentPhone,
      monthlyFee,
    });
    if (row.monthlyFee.trim() && monthlyFee === null) rowIssues.push("Monthly fee is invalid.");
    if (rowIssues.length) {
      issues.push(`Row ${index + 2}: ${rowIssues.join(" ")}`);
      return [];
    }
    return [{
      messId: messId.data,
      name: row.name.trim(),
      email: row.email.trim().toLowerCase() || null,
      parentName: row.parentName.trim() || null,
      parentPhone,
      monthlyFee,
    }];
  });
  if (issues.length) return { ok: false, issues: issues.slice(0, 20) };
  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.student.createMany({ data, skipDuplicates: true });
    await tx.activityEvent.create({
      data: {
        messId: messId.data,
        actorUserId: userId,
        kind: "STUDENTS_IMPORTED",
        entityType: "Student",
        summary: `Imported ${created.count} students`,
        details: { submitted: data.length, skipped: data.length - created.count },
      },
    });
    return created.count;
  });
  revalidatePath(`/mess/${messId.data}/students`);
  return { ok: true, message: `Imported ${result} students. ${data.length - result} duplicates were skipped.` };
}

export async function inviteMessMember(
  _previous: SettingsResult,
  formData: FormData,
): Promise<SettingsResult> {
  const parsed = z.object({
    messId: id,
    email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
    role: z.enum(["OWNER", "STAFF"]),
  }).safeParse({ messId: formData.get("messId"), email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) return { ok: false, issues: ["Enter a valid email and role."] };
  const { userId } = await requireMess(parsed.data.messId, "OWNER");
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  await prisma.$transaction(async (tx) => {
    const invite = await tx.messInvite.upsert({
      where: { messId_email: { messId: parsed.data.messId, email: parsed.data.email } },
      create: { ...parsed.data, token, invitedById: userId, expiresAt, acceptedAt: existingUser ? new Date() : null },
      update: { role: parsed.data.role, token, invitedById: userId, expiresAt, acceptedAt: existingUser ? new Date() : null },
    });
    if (existingUser) {
      await tx.messMember.upsert({
        where: { messId_userId: { messId: parsed.data.messId, userId: existingUser.id } },
        create: { messId: parsed.data.messId, userId: existingUser.id, role: parsed.data.role },
        update: { role: parsed.data.role },
      });
    }
    await tx.activityEvent.create({
      data: {
        messId: parsed.data.messId,
        actorUserId: userId,
        kind: existingUser ? "MEMBER_ADDED" : "MEMBER_INVITED",
        entityType: "MessInvite",
        entityId: invite.id,
        summary: `${existingUser ? "Added" : "Invited"} ${parsed.data.email} as ${parsed.data.role.toLowerCase()}`,
      },
    });
  });
  revalidatePath(`/mess/${parsed.data.messId}/more/access`);
  return {
    ok: true,
    message: existingUser ? "Access added immediately." : "Invite created. Share the link with this person.",
    inviteUrl: existingUser ? undefined : `/my-mess/invite?token=${token}`,
  };
}

export async function acceptMessInvite(tokenValue: string): Promise<SettingsResult> {
  const token = z.string().trim().min(20).max(100).safeParse(tokenValue);
  if (!token.success) return { ok: false, issues: ["This invite link is invalid."] };
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email?.trim().toLowerCase();
  if (!userId || !email) return { ok: false, issues: ["Sign in with the email that was invited."] };
  const invite = await prisma.messInvite.findUnique({ where: { token: token.data } });
  if (!invite || invite.acceptedAt || invite.expiresAt.getTime() < Date.now() || invite.email !== email) {
    return { ok: false, issues: ["This invite is expired, already used, or belongs to another email."] };
  }
  await prisma.$transaction([
    prisma.messMember.upsert({
      where: { messId_userId: { messId: invite.messId, userId } },
      create: { messId: invite.messId, userId, role: invite.role },
      update: { role: invite.role },
    }),
    prisma.messInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
    prisma.activityEvent.create({
      data: {
        messId: invite.messId,
        actorUserId: userId,
        kind: "MEMBER_INVITE_ACCEPTED",
        entityType: "MessInvite",
        entityId: invite.id,
        summary: `${email} accepted a ${invite.role.toLowerCase()} invite`,
      },
    }),
  ]);
  revalidatePath("/my-mess");
  return { ok: true, message: "Invite accepted." };
}

export async function rotateMessScanKey(messIdValue: string): Promise<void> {
  const messId = id.parse(messIdValue);
  const { userId } = await requireMess(messId, "OWNER");
  await prisma.$transaction([
    prisma.mess.update({ where: { id: messId }, data: { scanKeyVersion: { increment: 1 } } }),
    prisma.activityEvent.create({
      data: {
        messId,
        actorUserId: userId,
        kind: "SCAN_KEY_ROTATED",
        entityType: "Mess",
        entityId: messId,
        summary: "Rotated the entry QR code",
      },
    }),
  ]);
  revalidatePath(`/mess/${messId}/poster`);
}

export async function removeMessMember(formData: FormData): Promise<void> {
  const input = z.object({ messId: id, memberUserId: id }).parse({ messId: formData.get("messId"), memberUserId: formData.get("memberUserId") });
  const { userId } = await requireMess(input.messId, "OWNER");
  const member = await prisma.messMember.findUnique({ where: { messId_userId: { messId: input.messId, userId: input.memberUserId } }, select: { id: true, role: true, user: { select: { email: true, name: true } } } });
  if (!member) throw new Error("Member not found");
  if (member.role === "OWNER") {
    const owners = await prisma.messMember.count({ where: { messId: input.messId, role: "OWNER" } });
    if (owners <= 1) throw new Error("A mess must keep at least one owner");
  }
  await prisma.$transaction([
    prisma.messMember.delete({ where: { id: member.id } }),
    prisma.activityEvent.create({ data: { messId: input.messId, actorUserId: userId, kind: "MEMBER_REMOVED", entityType: "MessMember", entityId: member.id, summary: `Removed ${member.user.name ?? member.user.email ?? "member"} from mess access` } }),
  ]);
  revalidatePath(`/mess/${input.messId}/more/access`);
}
