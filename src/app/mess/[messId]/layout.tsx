import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireMess } from "@/actions/mess";
import { MessNav } from "./MessNav";

/**
 * The gate every mess page sits behind.
 *
 * `proxy.ts` already refuses anyone signed out, but signed in is not the same
 * as a member of *this* mess, and that check has to touch the database. Doing
 * it here means a new page under `/mess/[messId]` is protected the moment it
 * exists — the same reason the admin area has a layout guard as well as one in
 * every action.
 */
export default async function MessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ messId: string }>;
}) {
  const { messId } = await params;

  let role: string;
  try {
    ({ role } = await requireMess(messId, "STAFF"));
  } catch {
    redirect("/");
  }

  const mess = await prisma.mess.findUnique({
    where: { id: messId },
    select: { name: true },
  });
  if (!mess) redirect("/");

  return (
    <div className="min-h-screen bg-light">
      <header className="sticky top-0 z-30 border-b border-border bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link href={`/mess/${messId}`} className="font-heading text-lg font-bold text-text-main">
              {mess.name}
            </Link>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-text-muted">
              {role === "ADMIN" ? "Aangan admin" : role === "OWNER" ? "Owner" : "Staff"}
            </span>
          </div>
          <MessNav messId={messId} canSeeFees={role !== "STAFF"} />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
