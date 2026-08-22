import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { canonicalPhone } from "@/lib/phone";

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    const cleanPhone = canonicalPhone(phone);

    if (!cleanPhone) {
      return new NextResponse("Invalid phone number", { status: 400 });
    }

    // Rate limiting: prevent more than 3 requests per minute for the same phone
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentRequests = await prisma.otpCode.count({
      where: {
        phone: cleanPhone,
        createdAt: { gte: oneMinuteAgo }
      }
    });

    if (recentRequests >= 3) {
      return new NextResponse("Too many requests", { status: 429 });
    }

    // STRICT MAINTENANCE MODE: Only allow the admin phone number
    if (cleanPhone === "+917588603477") {
      const code = "121212";
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      await prisma.otpCode.create({
        data: {
          phone: cleanPhone,
          code,
          expiresAt
        }
      });
      
      console.log(`[MOCK OTP] Sent code ${code} to ${cleanPhone}`);
      return NextResponse.json({ success: true, message: "OTP_PAUSED" });
    }

    // Block everyone else
    return new NextResponse("New logins are temporarily disabled while we upgrade our systems.", { status: 403 });

  } catch (error: any) {
    console.error("Error in OTP send:", error);
    return new NextResponse(process.env.NODE_ENV === "development" ? error.message : "Internal Server Error", { status: 500 });
  }
}
