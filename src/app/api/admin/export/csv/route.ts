import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.phone) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  
  if (session.user.phone !== process.env.ADMIN_PHONE && session.user.role !== "admin") {
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
      `"${l.title.replace(/"/g, '""')}"`,
      l.price || "",
      l.yearlyPrice || "",
      `"${(l.location || "").replace(/"/g, '""')}"`,
      `"${(l.college?.name || "").replace(/"/g, '""')}"`,
      `"${(l.ownerName || "").replace(/"/g, '""')}"`,
      l.ownerPhone || "",
      l.vacantBeds === null ? "" : l.vacantBeds,
      status,
      l.createdAt.toISOString().split('T')[0]
    ].join(",");
  });

  const csv = [headers, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="aangan-listings-${new Date().toISOString().split('T')[0]}.csv"`
    }
  });
}
