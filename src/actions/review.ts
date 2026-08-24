"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ReviewEligibility = 
  | { eligible: true; reason: "lead" | "code"; code?: string }
  | { eligible: false; reason: "none" | "already_reviewed" };

export async function checkReviewEligibility(propertyId: string): Promise<ReviewEligibility> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { eligible: false, reason: "none" };

  // 1. Did they already review?
  const existingReview = await prisma.review.findUnique({
    where: {
      propertyId_userId: {
        propertyId,
        userId: session.user.id
      }
    }
  });

  if (existingReview) {
    return { eligible: false, reason: "already_reviewed" };
  }

  // 2. Are they a converted lead?
  if (session.user.phone) {
    const convertedLead = await prisma.lead.findFirst({
      where: {
        phone: session.user.phone,
        propertyId,
        stage: "CONVERTED"
      }
    });

    if (convertedLead) {
      return { eligible: true, reason: "lead" };
    }
  }

  return { eligible: false, reason: "none" };
}

export async function verifyReviewCode(propertyId: string, code: string): Promise<boolean> {
  const reviewCode = await prisma.reviewCode.findUnique({
    where: { code }
  });

  if (!reviewCode || reviewCode.propertyId !== propertyId) return false;
  if (reviewCode.expiresAt && reviewCode.expiresAt < new Date()) return false;

  return true;
}

export async function submitReview(propertyId: string, rating: number, comment: string | null, code?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (rating < 1 || rating > 5) throw new Error("Invalid rating");

  const eligibility = await checkReviewEligibility(propertyId);
  
  if (eligibility.eligible === false && eligibility.reason === "already_reviewed") {
    throw new Error("You have already reviewed this property.");
  }

  let verifiedVia = "";

  if (eligibility.eligible && eligibility.reason === "lead") {
    verifiedVia = "lead";
  } else if (code) {
    const isValidCode = await verifyReviewCode(propertyId, code);
    if (!isValidCode) throw new Error("Invalid or expired review code.");
    verifiedVia = "code";
  } else {
    throw new Error("You must provide a valid review code or have lived here.");
  }

  await prisma.review.create({
    data: {
      propertyId,
      userId: session.user.id,
      rating,
      comment: comment?.trim() || null,
      verifiedVia
    }
  });

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { slug: true, college: { select: { slug: true } } }
  });

  if (property) {
    revalidatePath(`/pg/${property.slug}`);
    if (property.college) {
      revalidatePath(`/kolhapur/${property.college.slug}`);
    }
    revalidatePath("/");
    revalidatePath("/search");
  }

  return { success: true };
}

export async function getPropertyReviews(propertyId: string) {
  return await prisma.review.findMany({
    where: { propertyId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { name: true }
      }
    }
  });
}
