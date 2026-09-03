import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MessLogin } from "@/components/mess/MessLogin";

export const metadata = { title: "My mess" };

/**
 * A student's way in.
 *
 * Matched on the email their mess put on the roll, so there is nothing to sign
 * up for: the first time they open this, they are already on it. Almost
 * everyone is in exactly one mess, and a chooser with one option is a page that
 * exists to be clicked through, so that case redirects.
 */
export default async function MyMessIndex({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  // Set by whichever door they picked at sign-in. It grants nothing — it only
  // decides who we tell them to go and ask when we cannot find them, and those
  // two people are different.
  const asOwner = (await searchParams).as === "owner";

  // The front door of mess.aanganpg.com: the host's `/` is rewritten here, so
  // this is the first thing a signed-out student sees. It has to explain itself
  // rather than bounce, because there is nowhere else on this host to bounce to.
  if (!email) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="font-heading text-3xl font-bold text-text-main">My mess</h1>
        <p className="mt-3 text-base text-text-muted">
          Sign in to see today&apos;s food, mark your meals, and see your fees.
        </p>
        {/* Said where the decision is made, not only in the footer. */}
        <p className="mt-2 text-sm text-text-muted">
          Google signs you in. We never see your password, and we ask for nothing else.
        </p>
        <MessLogin />
      </main>
    );
  }

  // The navbar has one "Mess" link for everybody, so this page has to sort out
  // who is knocking. An owner or helper is sent to the staff side, which already
  // knows how to find their mess — without this they land on "no mess has added
  // you yet" and their only way in is typing a mess id by hand.
  //
  // Membership wins over the roll: an account that is both runs the place.
  const userId = session?.user?.id;
  const staff =
    session?.user?.role === "admin" ||
    (userId != null &&
      (await prisma.messMember.findFirst({ where: { userId }, select: { id: true } })) != null);
  if (staff) redirect("/mess");

  const enrolments = await prisma.student.findMany({
    where: { email, leftAt: null },
    select: { mess: { select: { id: true, name: true } } },
    orderBy: { mess: { name: "asc" } },
  });

  if (enrolments.length === 1) redirect(`/my-mess/${enrolments[0].mess.id}`);

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-heading text-3xl font-bold text-text-main">My mess</h1>

      {enrolments.length === 0 ? (
        <div className="mt-4 rounded-2xl border-2 border-border bg-white p-6">
          <p className="text-lg font-semibold text-text-main">
            {asOwner ? "Your mess is not set up yet." : "No mess has added you yet."}
          </p>
          <p className="mt-2 text-base text-text-muted">
            {asOwner ? "Send Aangan this email: " : "Tell your mess to add this email: "}
            <span className="font-semibold">{email}</span>
          </p>
          <p className="mt-2 text-base text-text-muted">Then open this page again.</p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {enrolments.map(({ mess }) => (
            <li key={mess.id}>
              <Link
                href={`/my-mess/${mess.id}`}
                className="flex min-h-16 items-center rounded-2xl border-2 border-border bg-white px-5 text-lg font-semibold text-text-main transition-colors hover:bg-muted"
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
