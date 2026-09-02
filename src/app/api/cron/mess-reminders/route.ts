import { NextResponse } from "next/server";
import { runFeeReminders } from "@/lib/reminders";

/**
 * The daily overdue-fee run, triggered by the schedule in `vercel.json`.
 *
 * Authentication is the whole job of this file. Vercel sends
 * `Authorization: Bearer $CRON_SECRET` when that variable is set, and without
 * the check anyone who guesses the path could make the business text every
 * parent on its list.
 *
 * With `CRON_SECRET` unset the route refuses everything rather than running
 * open. An unreachable cron is a missed reminder; an open one is a megaphone.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new NextResponse("CRON_SECRET is not configured", { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const run = await runFeeReminders(new Date());
  console.log("[mess-reminders]", run);

  return NextResponse.json(run);
}
