import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";
import { canonicalPhone } from "@/lib/phone";

// ponytail: The rate limit here is advisory only. The client calls Firebase's signInWithPhoneNumber
// directly from AuthSheet.tsx, bypassing this endpoint entirely. This leaves us exposed to SMS
// pumping and billing loss. The proper fix is enabling Firebase App Check to secure the client.
// Limit to 3 OTP requests per phone number every 10 minutes
const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "10 m"),
    })
  : null;

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    const canon = canonicalPhone(phone);
    if (!canon) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    if (ratelimit) {
      const { success } = await ratelimit.limit(`otp_${canon}`);
      if (!success) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
