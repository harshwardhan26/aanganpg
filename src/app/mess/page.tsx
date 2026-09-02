import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const metadata = { title: "Mess" };

/**
 * The door into the mess module.
 *
 * One mess is the normal case and a chooser for a single option is a page that
 * exists only to be clicked through, so that case redirects. An Aangan admin
 * sees every mess, because support has to be able to reach one it does not own.
 */
export default async function MessIndex() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect("/");

  const isAdmin = session?.user?.role === "admin";

  const messes = isAdmin
    ? await prisma.mess.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
    : (
        await prisma.messMember.findMany({
          where: { userId },
          select: { mess: { select: { id: true, name: true } } },
          orderBy: { mess: { name: "asc" } },
        })
      ).map((m) => m.mess);

  if (messes.length === 1) redirect(`/mess/${messes[0].id}`);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-heading text-2xl font-bold text-text-main">Your messes</h1>

      {messes.length === 0 ? (
        <p className="mt-4 rounded-xl border border-border bg-white p-6 text-sm text-text-muted">
          This account is not attached to any mess yet. Ask Aangan to add you.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {messes.map((mess) => (
            <li key={mess.id}>
              <Link
                href={`/mess/${mess.id}`}
                className="block rounded-xl border border-border bg-white px-4 py-4 font-medium text-text-main hover:bg-muted"
              >
                {mess.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
