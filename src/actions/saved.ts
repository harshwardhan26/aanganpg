"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function toggleSavedProperty(propertyId: string, isSaving: boolean) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("You must be logged in to save rooms.");
  }

  const userId = session.user.id;

  if (isSaving) {
    await prisma.savedProperty.upsert({
      where: { userId_propertyId: { userId, propertyId } },
      create: { userId, propertyId },
      update: {},
    });
  } else {
    await prisma.savedProperty.deleteMany({
      where: { userId, propertyId },
    });
  }

  revalidatePath("/saved");
}

export async function getSavedPropertyIds() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  const saved = await prisma.savedProperty.findMany({
    where: { userId: session.user.id },
    select: { propertyId: true },
  });

  return saved.map((s) => s.propertyId);
}
