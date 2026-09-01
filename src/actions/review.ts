"use server";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { slidingLimiter, allowRequest } from "@/lib/rate-limit";
import { syncPropertyRating } from "@/lib/rating";

// A review is a once-per-property act, so anything above a handful an hour is
// someone working through guessed codes rather than someone writing reviews.
const ratelimit = slidingLimiter(5, "1 h");

/** Thrown to roll the transaction back, and caught to say why in plain words. */
class InvalidCodeError extends Error {}

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
 * Spend a review code, or refuse. NOT exported.
 *
 * Every export of a `"use server"` module is a public RPC endpoint, and a
 * function that takes a code and returns a clean boolean is an oracle anyone
 * could have hammered without signing in. `submitReview` is its only caller and
 * already sits behind a session.
 *
 * Spend, not check. The old version only asked whether the code was valid and
 * left it valid afterwards, so one code was an unlimited supply of "verified"
 * reviews for that hostel — and a code lives on a warden's notice board and in
 * forwarded WhatsApp messages, which is to say it leaks by design. The whole
 * product rests on a review having come from somebody who lived there.
 *
 * `updateMany` filtered on `usedAt: null` is the atomic part: Postgres decides
 * the winner, so two students submitting with the same code at the same instant
 * cannot both see it unused and both pass. Exactly one update reports a count of
 * 1. It runs on the transaction client, alongside the review it authorises, so a
 * review that fails to write does not leave a code spent on nothing.
 */
async function consumeReviewCode(
  tx: Prisma.TransactionClient,
  propertyId: string,
  code: string,
  userId: string,
): Promise<boolean> {
  const { count } = await tx.reviewCode.updateMany({
    where: {
      code,
      propertyId,
      usedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    data: { usedAt: new Date(), usedByUserId: userId },
  });

  return count === 1;
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

  const viaLead = eligibility.eligible && eligibility.reason === "lead";
  if (!viaLead && !code) {
    throw new Error("You must provide a valid review code or have lived here.");
  }

  // The eligibility check above reads before it writes, so two submits in flight
  // can both pass it. `@@unique([propertyId, userId])` is what actually decides —
  // catch its violation and say the same thing the check would have, instead of
  // showing the student a raw Prisma error string.
  //
  // Spending the code lives inside this transaction for the same reason: if the
  // review write loses the race, the code has to be unspent when the transaction
  // rolls back, or a student is told to try again with a ticket already torn.
  const userId = session.user.id;
  try {
    await prisma.$transaction(async (tx) => {
      let verifiedVia: string;
      if (viaLead) {
        verifiedVia = "lead";
      } else {
        if (!(await consumeReviewCode(tx, propertyId, code!, userId))) {
          throw new InvalidCodeError();
        }
        verifiedVia = "code";
      }

      await tx.review.create({
        data: {
          propertyId,
          userId,
          rating,
          comment: comment?.trim() || null,
          verifiedVia
        }
      });
      await syncPropertyRating(tx, propertyId);
    });
  } catch (e) {
    if (e instanceof InvalidCodeError) {
      throw new Error("That review code is not valid, or it has already been used.");
    }
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

/**
 * Reviews as the listing page renders them, and nothing more.
 *
 * `select`, not `include`. These rows are handed to `ReviewSection`, a client
 * component — React serialises the whole prop into the RSC payload no matter
 * which fields the component actually reads, so an `include` shipped every
 * reviewer's `userId` and the `verifiedVia` audit field to every visitor's
 * browser. Nothing on screen uses either.
 */
export async function getPropertyReviews(propertyId: string) {
  return await prisma.review.findMany({
    where: { propertyId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });
}
