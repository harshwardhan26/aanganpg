"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

function generateRandomCode(prefix: string) {
  const year = new Date().getFullYear();
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  // e.g. "GIRL-2026-X1Y2"
  return `${prefix.substring(0, 4).toUpperCase()}-${year}-${randomChars}`;
}

export async function getReviewCode(propertyId: string) {
  await requireAdmin();
  const code = await prisma.reviewCode.findFirst({
    where: { propertyId },
    orderBy: { createdAt: 'desc' }
  });
  return code?.code || null;
}

export async function generateReviewCode(propertyId: string) {
  await requireAdmin();
  
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

  let newCode = "";
  let isUnique = false;
  
  // Ensure uniqueness
  while (!isUnique) {
    newCode = generateRandomCode(property.slug.replace(/-/g, ''));
    const existing = await prisma.reviewCode.findUnique({ where: { code: newCode } });
    if (!existing) isUnique = true;
  }

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
  
  const review = await prisma.review.delete({
    where: { id: reviewId },
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
    revalidatePath("/");
    revalidatePath("/search");
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
