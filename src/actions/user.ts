"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canonicalPhone } from "@/lib/phone";

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

  const name = rawName.trim();
  if (name.length < 2) return { error: "Please enter your name." };

  const phone = canonicalPhone(rawPhone);
  if (!phone) return { error: "Please enter a valid Indian mobile number." };

  // `phone` is unique. A number already on another account means one student with
  // two sign-ins, not an error worth showing them — point the number at the account
  // they are actually using.
  await prisma.user.updateMany({ where: { phone, NOT: { id: session.user.id } }, data: { phone: null } });
  await prisma.user.update({ where: { id: session.user.id }, data: { name, phone } });

  return { name, phone };
}
