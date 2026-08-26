"use server";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { slidingLimiter, allowRequest } from "@/lib/rate-limit";

// A review is a once-per-property act, so anything above a handful an hour is
// someone working through guessed codes rather than someone writing reviews.
const ratelimit = slidingLimiter(5, "1 h");

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

/**
 * NOT exported. Every export of a `"use server"` module is a public RPC
 * endpoint, and this one takes a code and returns a clean boolean — an oracle
 * anyone could have hammered without signing in. `submitReview` is its only
 * caller and already sits behind a session.
 */
async function verifyReviewCode(propertyId: string, code: string): Promise<boolean> {
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

  if (!(await allowRequest(ratelimit, `review_${session.user.id}`))) {
    throw new Error("Too many attempts. Please try again later.");
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Invalid rating");
  // `comment` is `@db.Text`, so without a ceiling a single review can carry
  // megabytes. Longer than any student writes, short enough to stay a review.
  if (comment && comment.length > 2000) throw new Error("Review is too long (2000 characters max).");

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

  // The eligibility check above reads before it writes, so two submits in flight
  // can both pass it. `@@unique([propertyId, userId])` is what actually decides —
  // catch its violation and say the same thing the check would have, instead of
  // showing the student a raw Prisma error string.
  try {
    await prisma.review.create({
      data: {
        propertyId,
        userId: session.user.id,
        rating,
        comment: comment?.trim() || null,
        verifiedVia
      }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("You have already reviewed this property.");
    }
    throw e;
  }

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
