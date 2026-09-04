import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireMessOwner } from "@/actions/mess";
import { removeMessMember } from "@/actions/mess-settings";
import { InviteForm } from "./InviteForm";

export const metadata = { title: "People and access" };

export default async function AccessPage({ params }: { params: Promise<{ messId: string }> }) {
  const { messId } = await params;
  await requireMessOwner(messId);
  const mess = await prisma.mess.findUnique({
    where: { id: messId },
    select: {
      members: {
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          userId: true,
          role: true,
          user: { select: { name: true, email: true } },
        },
      },
      invites: {
        where: { acceptedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, role: true, token: true, expiresAt: true },
      },
    },
  });
  if (!mess) redirect("/mess");
  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-text-main">People and access</h1>
      <p className="mt-1 text-base text-text-muted">
        Owners see money and settings. Helpers can manage students and attendance.
      </p>
      <div className="mt-5">
        <InviteForm messId={messId} />
      </div>
      <section className="mt-6">
        <h2 className="font-heading text-xl font-bold text-text-main">Current access</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {mess.members.map((member) => (
            <li
              key={member.id}
              className="flex min-h-20 items-center justify-between gap-3 rounded-2xl border-2 border-border bg-white p-4"
            >
              <div>
                <p className="font-semibold text-text-main">
                  {member.user.name ?? member.user.email ?? "Unnamed account"}
                </p>
                <p className="text-sm text-text-muted">
                  {member.user.email} · {member.role === "OWNER" ? "Owner" : "Helper"}
                </p>
              </div>
              <form action={removeMessMember}>
                <input type="hidden" name="messId" value={messId} />
                <input type="hidden" name="memberUserId" value={member.userId} />
                <button className="min-h-11 rounded-xl border-2 border-red-800 px-4 text-sm font-semibold text-red-800">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
      {mess.invites.length > 0 && (
        <section className="mt-6">
          <h2 className="font-heading text-xl font-bold text-text-main">Pending invites</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {mess.invites.map((invite) => (
              <li key={invite.id} className="rounded-2xl border-2 border-border bg-white p-4">
                <p className="font-semibold text-text-main">
                  {invite.email} · {invite.role.toLowerCase()}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  Expires {invite.expiresAt.toLocaleDateString("en-IN")}
                </p>
                <p className="mt-2 break-all text-sm font-medium text-primary-strong">
                  /my-mess/invite?token={invite.token}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
