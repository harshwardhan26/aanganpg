"use server";

import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/** Same shape guard as `actions/admin.ts`: a cuid we issued, never free text. */
const idSchema = z.string().trim().min(1).max(64);

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

/**
 * A review code nobody can guess.
 *
 * The prefix and year are readable-by-design — they come off the public slug, so
 * they are not secret and were never the security. The secret is the tail, and
 * `Math.random()` made a poor one twice over: four base36 characters is 1.68M
 * combinations, and a PRNG's next output is derivable from its previous ones.
 * Ten crypto-random base32 characters put it out of reach of both.
 *
 * Crockford base32 (no I/L/O/U) because these get read aloud by a warden to a
 * student over the phone.
 */
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function generateRandomCode(prefix: string) {
  const year = new Date().getFullYear();
  const randomChars = Array.from(randomBytes(10))
    .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
    .join("");
  // e.g. "GIRL-2026-X1Y2Z3A4B5"
  return `${prefix.substring(0, 4).toUpperCase()}-${year}-${randomChars}`;
}

export async function getReviewCode(propertyId: string) {
  await requireAdmin();
  const parsedId = idSchema.safeParse(propertyId);
  if (!parsedId.success) throw new Error("Invalid listing id");
  const code = await prisma.reviewCode.findFirst({
    where: { propertyId: parsedId.data },
    orderBy: { createdAt: 'desc' }
  });
  return code?.code || null;
}

export async function generateReviewCode(propertyId: string) {
  await requireAdmin();
  const parsedId = idSchema.safeParse(propertyId);
  if (!parsedId.success) throw new Error("Invalid listing id");
  propertyId = parsedId.data;

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { slug: true }
  });

  if (!property) throw new Error("Property not found");

  // Deactivate old codes by setting expiry to now
  await prisma.reviewCode.updateMany({
    where: { propertyId, expiresAt: null },
    data: { expiresAt: new Date() }
  });

  // Bounded, not `while (!isUnique)`. At 10 crypto-random base32 characters a
  // collision is a once-in-the-heat-death event, but an unbounded loop around a
  // database call is a hang waiting for the one day it is wrong.
  let newCode = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    newCode = generateRandomCode(property.slug.replace(/-/g, ''));
    const existing = await prisma.reviewCode.findUnique({ where: { code: newCode } });
    if (!existing) break;
    newCode = "";
  }
  if (!newCode) throw new Error("Could not generate a unique review code. Please try again.");

  await prisma.reviewCode.create({
    data: {
      propertyId,
      code: newCode
    }
  });

  return newCode;
}

export async function deleteReview(reviewId: string) {
  await requireAdmin();
  const parsedId = idSchema.safeParse(reviewId);
  if (!parsedId.success) throw new Error("Invalid review id");

  const review = await prisma.review.delete({
    where: { id: parsedId.data },
    include: {
      property: {
        select: { slug: true, college: { select: { slug: true } } }
      }
    }
  });

  if (review.property) {
    revalidatePath(`/pg/${review.property.slug}`);
    if (review.property.college) {
      revalidatePath(`/kolhapur/${review.property.college.slug}`);
    }
    revalidatePath("/", "layout");
  }
}

export async function getReviewStats(propertyId: string) {
  const result = await prisma.review.aggregate({
    where: { propertyId },
    _avg: { rating: true },
    _count: { rating: true }
  });

  return {
    average: result._avg.rating || 0,
    count: result._count.rating || 0
  };
}
