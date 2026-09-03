import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import prisma from "@/lib/prisma";
import { AccessControls, type Member } from "./AccessControls";
import { updateMessSubscription } from "@/actions/mess-admin";

export const metadata = { title: "Access" };

export default async function MessAccessPage({
  params,
}: {
  params: Promise<{ messId: string }>;
}) {
  const { messId } = await params;
  async function updateSubscription(formData: FormData) {
    "use server";
    await updateMessSubscription(formData);
  }

  const mess = await prisma.mess.findUnique({
    where: { id: messId },
    select: {
      name: true,
      members: {
        orderBy: { role: "asc" },
        select: {
          userId: true,
          role: true,
          user: { select: { name: true, email: true } },
        },
      },
      _count: { select: { students: true } },
      subscriptionPlan: true,
      subscriptionStatus: true,
      trialEndsAt: true,
    },
  });
  if (!mess) notFound();

  const members: Member[] = mess.members.map((m) => ({
    userId: m.userId,
    role: m.role,
    name: m.user.name,
    email: m.user.email,
  }));

  return (
    <div className="mx-auto max-w-md">
      <Link
        href="/mess-admin"
        className="inline-flex min-h-11 items-center text-base font-medium text-primary-strong underline underline-offset-4"
      >
        ← All messes
      </Link>

      <h1 className="mt-2 font-heading text-2xl font-bold text-text-main">{mess.name}</h1>
      <p className="text-base text-text-muted">{mess._count.students} students on the roll</p>

      <Link
        href={`/mess/${messId}`}
        className="mt-4 mb-6 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-text-main transition-colors hover:bg-slate-200"
      >
        Open as owner
        <ArrowUpRight className="h-4 w-4" aria-hidden />
      </Link>

      <AccessControls messId={messId} members={members} />

      <form action={updateSubscription} className="mt-6 rounded-2xl border border-border bg-white p-5">
        <input type="hidden" name="messId" value={messId} />
        <h2 className="font-heading text-xl font-bold text-text-main">Subscription</h2>
        <p className="mt-1 text-sm text-text-muted">{mess.trialEndsAt ? `Trial ends ${mess.trialEndsAt.toLocaleDateString("en-IN")}.` : "No trial end recorded."}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold text-text-main">Plan<select name="plan" defaultValue={mess.subscriptionPlan} className="mt-1 min-h-11 w-full rounded-xl border-2 border-border bg-white px-3 text-base font-normal"><option value="TRIAL">Trial</option><option value="STARTER">Starter</option><option value="GROWTH">Growth</option></select></label>
          <label className="text-sm font-semibold text-text-main">Status<select name="status" defaultValue={mess.subscriptionStatus} className="mt-1 min-h-11 w-full rounded-xl border-2 border-border bg-white px-3 text-base font-normal"><option value="TRIAL">Trial</option><option value="ACTIVE">Active</option><option value="PAST_DUE">Past due</option><option value="PAUSED">Paused</option><option value="CANCELLED">Cancelled</option></select></label>
        </div>
        <button className="mt-4 min-h-11 rounded-xl bg-primary-strong px-4 text-sm font-semibold text-white">Update subscription</button>
      </form>
    </div>
  );
}
