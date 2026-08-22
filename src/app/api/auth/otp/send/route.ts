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

    // PAUSED OTP MODE: Force the code to be 123456 for everyone to save money
    const code = "123456";

    // Expire in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpCode.create({
      data: {
        phone: cleanPhone,
        code,
        expiresAt
      }
    });

    console.log(`[MOCK OTP] Sent code ${code} to ${cleanPhone}`);
    
    // Return a special message so the frontend knows it's mocked
    return NextResponse.json({ success: true, message: "OTP_PAUSED" });

  } catch (error: any) {
    console.error("Error in OTP send:", error);
    return new NextResponse(process.env.NODE_ENV === "development" ? error.message : "Internal Server Error", { status: 500 });
  }
}
