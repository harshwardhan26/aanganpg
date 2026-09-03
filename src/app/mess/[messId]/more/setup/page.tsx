import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireMess } from "@/actions/mess";
import { rotateMessScanKey } from "@/actions/mess-settings";
import { toClockValue } from "@/lib/mess";
import { SetupForm } from "./SetupForm";

export const metadata = { title: "Mess setup" };

export default async function SetupPage({ params }: { params: Promise<{ messId: string }> }) {
  const { messId } = await params;
  const { role } = await requireMess(messId, "STAFF");
  if (role === "STAFF") redirect(`/mess/${messId}`);
  const mess = await prisma.mess.findUnique({ where: { id: messId }, select: { id: true, name: true, address: true, contactPhone: true, dueDay: true, skipCutoffMinutes: true, setupCompletedAt: true, subscriptionPlan: true, subscriptionStatus: true, trialEndsAt: true, scanKeyVersion: true } });
  if (!mess) redirect("/mess");
  const rotate = rotateMessScanKey.bind(null, messId);
  return <div><h1 className="font-heading text-3xl font-bold text-text-main">Mess setup</h1><p className="mt-1 text-base text-text-muted">Details that power fees, receipts, and meal planning.</p><SetupForm mess={{ id: mess.id, name: mess.name, address: mess.address, contactPhone: mess.contactPhone, dueDay: mess.dueDay, skipCutoff: toClockValue(mess.skipCutoffMinutes) }} /><section className="mt-5 rounded-2xl border-2 border-border bg-white p-5"><h2 className="font-heading text-xl font-bold text-text-main">Subscription</h2><p className="mt-2 text-base text-text-muted">{mess.subscriptionPlan} · {mess.subscriptionStatus}{mess.trialEndsAt ? ` · trial ends ${mess.trialEndsAt.toLocaleDateString("en-IN")}` : ""}</p></section><section className="mt-5 rounded-2xl border-2 border-border bg-white p-5"><h2 className="font-heading text-xl font-bold text-text-main">Entry QR security</h2><p className="mt-2 text-base text-text-muted">Current version: {mess.scanKeyVersion}. Rotating immediately invalidates every old printed or photographed QR.</p><form action={rotate} className="mt-4"><label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-text-main"><input type="checkbox" required className="h-5 w-5" /> I will print and replace the QR poster now.</label><button className="mt-3 min-h-12 rounded-xl border-2 border-red-800 px-5 text-base font-semibold text-red-800">Rotate QR code</button></form></section></div>;
}
