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

    // Generate a random 6 digit code
    // If it's the test admin phone, use a fixed code 123456
    const isTestAdmin = process.env.NODE_ENV === "development" && cleanPhone === "+919999999999";
    const code = isTestAdmin 
      ? "123456" 
      : Math.floor(100000 + Math.random() * 900000).toString();

    // Expire in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpCode.create({
      data: {
        phone: cleanPhone,
        code,
        expiresAt
      }
    });

    if (isTestAdmin) {
      return NextResponse.json({ success: true, message: "Test admin OTP sent" });
    }

    const apiKey = process.env.FAST2SMS_API_KEY;

    if (!apiKey) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[MOCK OTP] Sent code ${code} to ${cleanPhone}`);
        return NextResponse.json({ success: true, message: "Mock OTP sent (check console)" });
      } else {
        console.error("FAST2SMS_API_KEY is missing in production");
        return new NextResponse("SMS gateway not configured", { status: 500 });
      }
    }

    // Send using Fast2SMS
    // Fast2SMS requires 10 digit number without +91
    const rawNumber = cleanPhone.replace("+91", "");

    const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        "authorization": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        route: "otp",
        variables_values: code,
        numbers: rawNumber
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: "Unknown Fast2SMS error" }));
      console.error("Fast2SMS error:", res.status, errorData);
      return new NextResponse(errorData.message || "Failed to send OTP via Fast2SMS", { status: 500 });
    }

    // Fast2SMS returns 200 even for some errors, check the 'return' flag
    const responseData = await res.json();
    if (responseData.return === false) {
      console.error("Fast2SMS logic error:", responseData);
      return new NextResponse(responseData.message || "Fast2SMS rejected the request", { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error in OTP send:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
