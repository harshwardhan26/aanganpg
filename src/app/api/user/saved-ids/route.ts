import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ ids: [] });
  }

  const saved = await prisma.savedProperty.findMany({
    where: { userId: session.user.id },
    select: { propertyId: true },
  });

  return NextResponse.json({ ids: saved.map(s => s.propertyId) });
}
