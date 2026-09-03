import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { acceptMessInvite } from "@/actions/mess-settings";

export const metadata = { title: "Accept mess invite" };

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  const now = new Date();
  const invite = token ? await prisma.messInvite.findUnique({ where: { token }, select: { email: true, role: true, expiresAt: true, acceptedAt: true, mess: { select: { id: true, name: true } } } }) : null;
  const usable = invite && !invite.acceptedAt && invite.expiresAt.getTime() >= now.getTime();
  async function accept() {
    "use server";
    const result = await acceptMessInvite(token);
    if (result.ok && invite) redirect(`/mess/${invite.mess.id}`);
    redirect(`/my-mess/invite?token=${encodeURIComponent(token)}&failed=1`);
  }
  return <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10"><section className="w-full rounded-3xl border-2 border-border bg-white p-6 text-center"><p className="text-sm font-bold uppercase tracking-wide text-primary-strong">Aangan Mess</p><h1 className="mt-2 font-heading text-3xl font-bold text-text-main">{usable ? `Join ${invite.mess.name}` : "Invite unavailable"}</h1>{usable ? <><p className="mt-3 text-base text-text-muted">This gives <strong>{invite.email}</strong> {invite.role === "OWNER" ? "owner" : "helper"} access.</p><form action={accept} className="mt-6"><button className="min-h-12 w-full rounded-xl bg-primary-strong px-5 text-base font-semibold text-white">Accept invite</button></form></> : <p className="mt-3 text-base text-text-muted">Ask the mess owner for a new invite link.</p>}</section></main>;
}
