import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import prisma from "@/lib/prisma";
import { AccessControls, type Member } from "./AccessControls";

export const metadata = { title: "Access" };

export default async function MessAccessPage({
  params,
}: {
  params: Promise<{ messId: string }>;
}) {
  const { messId } = await params;

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
    </div>
  );
}
