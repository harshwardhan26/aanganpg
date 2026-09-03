"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { slidingLimiter, allowRequest } from "@/lib/rate-limit";

/**
 * Aangan's own controls: making a mess exist, and saying who runs it.
 *
 * Separate from `actions/mess.ts` because the gate is different. That file asks
 * "are you staff of this mess"; this one asks "are you Aangan". A mess owner
 * must never be able to hand himself another mess.
 */
const idSchema = z.string().trim().min(1).max(64);
const emailSchema = z.string().trim().max(160).toLowerCase();

/**
 * The security boundary. The layout guard is convenience — it stops a wrong
 * screen rendering; this stops a wrong write, and it is the one that matters.
 */
/*
 * Tighter than the mess actions, deliberately. Nobody onboards twenty messes a
 * minute, and these are the calls that hand out access to somebody else's
 * students — the ones worth slowing down if an admin session is ever taken.
 */
const adminLimiter = slidingLimiter(20, "1 m");

async function requireAdmin(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin" || !session.user.id) {
    throw new Error("Unauthorized");
  }

  if (!(await allowRequest(adminLimiter, `mess-admin:${session.user.id}`))) {
    throw new Error("Too many requests");
  }

  return session.user.id;
}

export type AdminResult = { ok: true } | { ok: false; error: string };

/** `looks@like.this`, checked only for shape. */
function emailShapeOk(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/**
 * Creates a mess and hands it to its owner.
 *
 * The owner must already have signed in once: that Google sign-in is what
 * creates the `User` row this attaches to, and there is no way to conjure one
 * that the adapter would later match. So the failure here is a real instruction
 * — go and ask them to sign in — rather than an error code.
 */
export async function createMess(formData: FormData): Promise<AdminResult> {
  await requireAdmin();

  const name = z.string().trim().max(120).parse(formData.get("name") ?? "");
  const email = emailSchema.parse(formData.get("email") ?? "");

  if (!name) return { ok: false, error: "Give the mess a name." };
  if (!emailShapeOk(email)) return { ok: false, error: "That does not look like an email." };

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    return {
      ok: false,
      error: `No account for ${email} yet. Ask them to open the mess site and sign in with Google once, then add them here.`,
    };
  }

  const mess = await prisma.mess.create({
    data: { name, members: { create: { userId: user.id, role: "OWNER" } } },
  });

  revalidatePath("/mess-admin");
  revalidatePath(`/mess-admin/${mess.id}`);
  return { ok: true };
}

/**
 * Adds a helper, or a second owner.
 *
 * A helper marks attendance and never sees money — that split is enforced in
 * `requireMess`, not by hiding a tab, so handing someone STAFF here really does
 * keep the fees screen shut.
 */
export async function addMember(formData: FormData): Promise<AdminResult> {
  await requireAdmin();

  const messId = idSchema.parse(formData.get("messId"));
  const email = emailSchema.parse(formData.get("email") ?? "");
  const role = z.enum(["OWNER", "STAFF"]).parse(formData.get("role") ?? "STAFF");

  if (!emailShapeOk(email)) return { ok: false, error: "That does not look like an email." };

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    return {
      ok: false,
      error: `No account for ${email} yet. Ask them to sign in with Google once, then add them.`,
    };
  }

  const mess = await prisma.mess.findUnique({ where: { id: messId }, select: { id: true } });
  if (!mess) return { ok: false, error: "That mess is gone." };

  // Upsert, not create: adding someone who is already on the list should change
  // their role rather than fail on the unique index.
  await prisma.messMember.upsert({
    where: { messId_userId: { messId, userId: user.id } },
    create: { messId, userId: user.id, role },
    update: { role },
  });

  revalidatePath(`/mess-admin/${messId}`);
  return { ok: true };
}

/**
 * Takes someone's access away.
 *
 * The last owner cannot be removed. A mess with no owner is a mess nobody can
 * open, and the only way back would be this console — which is exactly the
 * situation an owner would call about on a Sunday.
 */
export async function removeMember(messId: string, userId: string): Promise<AdminResult> {
  await requireAdmin();

  const id = idSchema.parse(messId);
  const uid = idSchema.parse(userId);

  const member = await prisma.messMember.findUnique({
    where: { messId_userId: { messId: id, userId: uid } },
    select: { role: true },
  });
  if (!member) return { ok: false, error: "They are not on this mess." };

  if (member.role === "OWNER") {
    const owners = await prisma.messMember.count({ where: { messId: id, role: "OWNER" } });
    if (owners <= 1) {
      return { ok: false, error: "Add another owner first. A mess cannot be left without one." };
    }
  }

  await prisma.messMember.delete({ where: { messId_userId: { messId: id, userId: uid } } });

  revalidatePath(`/mess-admin/${id}`);
  return { ok: true };
}
