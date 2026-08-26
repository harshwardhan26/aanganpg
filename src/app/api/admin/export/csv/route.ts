import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { csvField } from "@/lib/escape";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const listings = await prisma.property.findMany({
    include: { college: true },
    orderBy: { createdAt: "desc" }
  });

  const headers = [
    "Title",
    "Monthly Rent",
    "Yearly Rent",
    "Location",
    "Nearest College",
    "Owner Name",
    "Owner Phone",
    "Vacant Beds",
    "Status",
    "Created At"
  ].join(",");

  const rows = listings.map(l => {
    const status = l.deletedAt ? "Deleted" : l.closedAt ? "Closed" : l.vacantBeds === 0 ? "Full" : "Active";
    return [
      l.title,
      l.price,
      l.yearlyPrice,
      l.location,
      l.college?.name,
      l.ownerName,
      // Quoted like everything else: a leading "+" on an E.164 number is exactly
      // the character a spreadsheet reads as a formula.
      l.ownerPhone,
      l.vacantBeds,
      status,
      l.createdAt.toISOString().split('T')[0]
    ].map(csvField).join(",");
  });

  const csv = [headers, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="aangan-listings-${new Date().toISOString().split('T')[0]}.csv"`
    }
  });
}
