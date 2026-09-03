import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireMess } from "@/actions/mess";
import { deleteNotice } from "@/actions/mess-operations";
import { NoticeForm } from "./NoticeForm";

export const metadata = { title: "Notices" };

export default async function NoticesPage({ params }: { params: Promise<{ messId: string }> }) {
  const { messId } = await params;
  const { role } = await requireMess(messId, "STAFF");
  if (role === "STAFF") redirect(`/mess/${messId}`);
  const notices = await prisma.notice.findMany({ where: { messId }, orderBy: { startsAt: "desc" }, take: 50 });
  return <div><h1 className="font-heading text-3xl font-bold text-text-main">Notices</h1><p className="mt-1 text-base text-text-muted">Menu changes, closures, and updates shown inside Aangan.</p><div className="mt-5"><NoticeForm messId={messId} /></div><section className="mt-6"><h2 className="font-heading text-xl font-bold text-text-main">Published</h2>{notices.length === 0 ? <p className="mt-3 rounded-2xl border-2 border-border bg-white p-6 text-text-muted">No notices yet.</p> : <ul className="mt-3 flex flex-col gap-3">{notices.map((notice) => <li key={notice.id} className="rounded-2xl border-2 border-border bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-text-main">{notice.title}</p><p className="mt-1 whitespace-pre-wrap text-sm text-text-muted">{notice.body}</p><p className="mt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{notice.audience.toLowerCase()} · {notice.expiresAt ? `until ${notice.expiresAt.toLocaleDateString("en-IN")}` : "no expiry"}</p></div><form action={deleteNotice}><input type="hidden" name="messId" value={messId} /><input type="hidden" name="noticeId" value={notice.id} /><button className="min-h-11 rounded-xl border-2 border-red-800 px-3 text-sm font-semibold text-red-800">Remove</button></form></div></li>)}</ul>}</section></div>;
}
