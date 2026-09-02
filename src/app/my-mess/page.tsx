import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const metadata = { title: "My mess" };

/**
 * A student's way in.
 *
 * Matched on the email their mess put on the roll, so there is nothing to sign
 * up for: the first time they open this, they are already on it. Almost
 * everyone is in exactly one mess, and a chooser with one option is a page that
 * exists to be clicked through, so that case redirects.
 */
export default async function MyMessIndex() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) redirect("/");

  const enrolments = await prisma.student.findMany({
    where: { email, leftAt: null },
    select: { mess: { select: { id: true, name: true } } },
    orderBy: { mess: { name: "asc" } },
  });

  if (enrolments.length === 1) redirect(`/my-mess/${enrolments[0].mess.id}`);

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-heading text-2xl font-bold text-text-main">My mess</h1>

      {enrolments.length === 0 ? (
        <div className="mt-4 rounded-xl border border-border bg-white p-6">
          <p className="text-sm text-text-main">
            No mess has added this account yet.
          </p>
          <p className="mt-2 text-sm text-text-muted">
            Ask your mess to add <span className="font-medium">{email}</span> to their list, then
            open this page again.
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {enrolments.map(({ mess }) => (
            <li key={mess.id}>
              <Link
                href={`/my-mess/${mess.id}`}
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
