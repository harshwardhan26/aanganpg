"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { canonicalPhone } from "@/lib/phone";
import {
  attendanceDay,
  mealAt,
  messRoleAllows,
  studentFormIssues,
  type MealName,
  type MessRoleName,
} from "@/lib/mess";

const idSchema = z.string().trim().min(1).max(64);

/**
 * The one gate into a mess.
 *
 * Every read and write goes through this, so there is a single definition of
 * "may open this mess" instead of one per action. An Aangan admin passes too —
 * support cannot help a mess owner it is locked out of.
 *
 * Returns the membership role so callers can vary what they show without
 * asking the database a second time.
 */
export async function requireMess(
  messId: string,
  required: MessRoleName = "STAFF",
): Promise<{ userId: string; role: MessRoleName | "ADMIN" }> {
  const id = idSchema.parse(messId);
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  if (session?.user?.role === "admin") return { userId, role: "ADMIN" };

  const member = await prisma.messMember.findUnique({
    where: { messId_userId: { messId: id, userId } },
    select: { role: true },
  });

  if (!messRoleAllows(member?.role, required)) throw new Error("Unauthorized");
  return { userId, role: member!.role };
}

const studentSchema = z.object({
  messId: idSchema,
  name: z.string().trim().max(120),
  email: z.string().trim().max(160).optional().default(""),
  photoUrl: z.string().trim().max(500).optional().default(""),
  parentName: z.string().trim().max(120).optional().default(""),
  parentPhone: z.string().trim().max(20).optional().default(""),
  // Kept as a string here and parsed below: `Number("")` is 0, and 0 is a real
  // fee. The empty box has to be told apart from a free student.
  monthlyFee: z.string().trim().max(10).optional().default(""),
});

function parseFee(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export type StudentResult = { ok: true } | { ok: false; issues: string[] };

export async function saveStudent(
  studentId: string | null,
  formData: FormData,
): Promise<StudentResult> {
  const input = studentSchema.parse({
    messId: formData.get("messId"),
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    photoUrl: formData.get("photoUrl") ?? "",
    parentName: formData.get("parentName") ?? "",
    parentPhone: formData.get("parentPhone") ?? "",
    monthlyFee: formData.get("monthlyFee") ?? "",
  });

  await requireMess(input.messId, "STAFF");

  const parentPhone = canonicalPhone(input.parentPhone);
  const monthlyFee = parseFee(input.monthlyFee);

  const issues = studentFormIssues({
    name: input.name,
    monthlyFee,
    parentPhone,
    parentPhoneRaw: input.parentPhone,
  });
  if (issues.length) return { ok: false, issues };

  const data = {
    name: input.name.trim(),
    // Lowercased on the way in, because the session email it is matched against
    // at scan time is lowercased too. One casing, or half the scans miss.
    email: input.email.trim().toLowerCase() || null,
    photoUrl: input.photoUrl.trim() || null,
    parentName: input.parentName.trim() || null,
    parentPhone,
    monthlyFee,
  };

  if (studentId) {
    const id = idSchema.parse(studentId);
    // Scoped by messId as well as id: without it, a valid id from another mess
    // would be editable by anyone holding membership of any mess.
    const updated = await prisma.student.updateMany({
      where: { id, messId: input.messId },
      data,
    });
    if (updated.count === 0) throw new Error("Not found");
  } else {
    await prisma.student.create({ data: { ...data, messId: input.messId } });
  }

  revalidatePath(`/mess/${input.messId}/students`);
  revalidatePath(`/mess/${input.messId}/checkin`);
  revalidatePath(`/mess/${input.messId}`);
  return { ok: true };
}

/** Marks a student as gone without deleting the attendance history behind them. */
export async function setStudentLeft(
  messId: string,
  studentId: string,
  left: boolean,
): Promise<void> {
  const id = idSchema.parse(studentId);
  await requireMess(messId, "OWNER");

  const updated = await prisma.student.updateMany({
    where: { id, messId },
    data: { leftAt: left ? new Date() : null },
  });
  if (updated.count === 0) throw new Error("Not found");

  revalidatePath(`/mess/${messId}/students`);
  revalidatePath(`/mess/${messId}/checkin`);
  revalidatePath(`/mess/${messId}`);
}

export type FoundStudent = {
  id: string;
  name: string;
  photoUrl: string | null;
  monthlyFee: number | null;
  joinedAt: Date;
  leftAt: Date | null;
};

/**
 * The signed-in person, as a student of this mess — or null.
 *
 * The student side of the app has no membership row and no role: being signed
 * in with an email that a mess put on its roll is the entire credential. That
 * is deliberately weaker than `requireMess`, because it grants a different and
 * much smaller thing — your own attendance and your own dues, never anyone
 * else's and never a staff screen.
 */
export async function findStudent(messId: string): Promise<FoundStudent | null> {
  const id = idSchema.parse(messId);
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;

  return prisma.student.findFirst({
    where: { messId: id, email },
    select: {
      id: true,
      name: true,
      photoUrl: true,
      monthlyFee: true,
      joinedAt: true,
      leftAt: true,
    },
  });
}

export type ScanOutcome =
  | { ok: true; name: string; photoUrl: string | null; meal: MealName; alreadyMarked: boolean }
  | { ok: false; reason: "no-meal" | "not-a-student" | "left" };

/**
 * A student marking themselves present by opening the poster link.
 *
 * Identity comes from the Google session, never from anything in the URL: the
 * poster is a plain link that anyone can photograph, so the link must not be
 * able to say who is scanning it. A stranger who opens it is simply not a
 * student of this mess and gets nothing.
 *
 * Deliberately not guarded by `requireMess` — a student is not a member of the
 * mess in the staff sense, and never sees a staff screen. Being signed in and
 * being on the roll is the whole check.
 */
export async function recordScan(messId: string, now = new Date()): Promise<ScanOutcome> {
  const id = idSchema.parse(messId);

  const meal = mealAt(now);
  if (!meal) return { ok: false, reason: "no-meal" };

  const student = await findStudent(id);
  if (!student) return { ok: false, reason: "not-a-student" };
  if (student.leftAt) return { ok: false, reason: "left" };

  const day = attendanceDay(now);

  // Scanning twice for one meal is the normal case, not an error — a student
  // reopens the page to show the receipt again at the counter. The unique index
  // makes the second scan return the first one's receipt instead of a second
  // helping.
  const existing = await prisma.attendance.findUnique({
    where: { studentId_day_meal: { studentId: student.id, day, meal } },
    select: { id: true },
  });

  if (!existing) {
    await prisma.attendance.create({
      data: { studentId: student.id, day, meal, method: "SCAN" },
    });
    revalidatePath(`/mess/${id}`);
    revalidatePath(`/mess/${id}/checkin`);
  }

  return {
    ok: true,
    name: student.name,
    photoUrl: student.photoUrl,
    meal,
    alreadyMarked: existing !== null,
  };
}

/**
 * Records a fee as paid, or undoes that.
 *
 * Owner only. Staff run the door and never see money — the same split the plan
 * promised the client, enforced here rather than by hiding the tab.
 *
 * The amount is copied from the student's current fee at the moment of payment,
 * so raising the fee in November does not retroactively change what October
 * says was collected.
 */
export async function setPaid(
  messId: string,
  studentId: string,
  monthIso: string,
  paid: boolean,
): Promise<void> {
  const id = idSchema.parse(studentId);
  // `YYYY-MM-DD`, always the first of a month — it comes from `monthKey` on the
  // page, never from a person typing.
  const month = new Date(`${z.string().regex(/^\d{4}-\d{2}-01$/).parse(monthIso)}T00:00:00.000Z`);

  await requireMess(messId, "OWNER");

  const student = await prisma.student.findFirst({
    where: { id, messId },
    select: { monthlyFee: true },
  });
  if (!student) throw new Error("Not found");

  await prisma.payment.upsert({
    where: { studentId_month: { studentId: id, month } },
    create: {
      studentId: id,
      month,
      amount: student.monthlyFee,
      paidAt: paid ? new Date() : null,
    },
    update: { paidAt: paid ? new Date() : null },
  });

  revalidatePath(`/mess/${messId}/fees`);
}

const menuSchema = z.object({
  messId: idSchema,
  weekday: z.coerce.number().int().min(0).max(6),
  meal: z.enum(["BREAKFAST", "LUNCH", "DINNER"]),
  items: z.string().trim().max(300),
});

/**
 * Sets one slot of the weekly rotation.
 *
 * Clearing the box deletes the row rather than storing an empty string, so
 * "nothing set" has one representation and the student screen can say "not put
 * up yet" instead of showing a blank line that looks like a bug.
 */
export async function saveMenu(formData: FormData): Promise<void> {
  const input = menuSchema.parse({
    messId: formData.get("messId"),
    weekday: formData.get("weekday"),
    meal: formData.get("meal"),
    items: formData.get("items") ?? "",
  });

  await requireMess(input.messId, "OWNER");

  const where = {
    messId_weekday_meal: {
      messId: input.messId,
      weekday: input.weekday,
      meal: input.meal,
    },
  };

  if (!input.items) {
    await prisma.menuItem.deleteMany({
      where: { messId: input.messId, weekday: input.weekday, meal: input.meal },
    });
  } else {
    await prisma.menuItem.upsert({
      where,
      create: {
        messId: input.messId,
        weekday: input.weekday,
        meal: input.meal,
        items: input.items,
      },
      update: { items: input.items },
    });
  }

  revalidatePath(`/mess/${input.messId}/menu`);
  revalidatePath(`/my-mess/${input.messId}`);
}

/**
 * Today's attendance, toggled.
 *
 * The unique index on `[studentId, day]` is what makes this safe: two taps in
 * the same second cannot produce two rows, so the worst a double-tap does is
 * undo itself. Returns the resulting state so the button can render it without
 * a second round trip.
 */
export async function toggleAttendance(
  messId: string,
  studentId: string,
  meal: MealName,
): Promise<{ present: boolean }> {
  const id = idSchema.parse(studentId);
  const mealName = z.enum(["BREAKFAST", "LUNCH", "DINNER"]).parse(meal);
  await requireMess(messId, "STAFF");

  const student = await prisma.student.findFirst({
    where: { id, messId },
    select: { id: true },
  });
  if (!student) throw new Error("Not found");

  const day = attendanceDay(new Date());
  const existing = await prisma.attendance.findUnique({
    where: { studentId_day_meal: { studentId: id, day, meal: mealName } },
    select: { id: true },
  });

  if (existing) {
    await prisma.attendance.delete({ where: { id: existing.id } });
  } else {
    await prisma.attendance.create({ data: { studentId: id, day, meal: mealName, method: "MANUAL" } });
  }

  revalidatePath(`/mess/${messId}/checkin`);
  revalidatePath(`/mess/${messId}`);
  return { present: !existing };
}
