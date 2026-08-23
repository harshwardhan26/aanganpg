"use server";

import { Ratelimit } from "@upstash/ratelimit";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canonicalPhone } from "@/lib/phone";

// Claiming a number is a write against a unique column, and the failure mode is
// someone walking the number space. Five attempts in ten minutes is generous for
// a student correcting a typo and useless for enumeration.
const ratelimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "10 m") })
  : null;

/**
 * Attach a name and phone number to the signed-in account.
 *
 * Google hands us an email and a display name, never a number, so this is how a
 * student's phone reaches the lead record — and the number is the entire reason
 * the sign-in gate exists. Stored E.164 like every other number in the database.
 */
export async function saveUserProfile(
  rawName: string,
  rawPhone: string,
): Promise<{ name: string; phone: string } | { error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "You must be signed in." };

  if (ratelimit) {
    const { success } = await ratelimit.limit(`profile_${session.user.id}`);
    if (!success) return { error: "Too many attempts. Please try again in a few minutes." };
  }

  const name = rawName.trim();
  if (name.length < 2) return { error: "Please enter your name." };

  const phone = canonicalPhone(rawPhone);
  if (!phone) return { error: "Please enter a valid Indian mobile number." };

  const holder = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, email: true },
  });

  if (holder && holder.id !== session.user.id) {
    // A row with no email is a leftover from the phone-OTP era: the same student,
    // signing in a new way. Releasing the number migrates them onto their Google
    // account. A row *with* an email is a different person who signed in with
    // Google, and taking their number from them would let anyone strip an account
    // by guessing at numbers — so that one is refused.
    if (holder.email) {
      return { error: "That number is already on another account. Use a different number, or sign in with the Google account you used before." };
    }
    await prisma.user.update({ where: { id: holder.id }, data: { phone: null } });
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { name, phone } });

  return { name, phone };
}
