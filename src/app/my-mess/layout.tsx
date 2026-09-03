import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MessNavbar } from "@/components/mess/MessNavbar";
import { SkipLink } from "@/components/mess/SkipLink";

export const metadata: Metadata = {
  title: { default: "Aangan Mess", template: "%s | Aangan Mess" },
  // The mess site is for the people already on a mess roll. There is nothing
  // here for a search engine, and a student's fee page has no business being
  // indexed at all.
  robots: { index: false, follow: false },
};

/**
 * The student side of mess.aanganpg.com.
 *
 * The same bar as the landing page, so signing in does not feel like landing on
 * a different website. It carries the brand, a way back to their own mess, and
 * sign out — nothing else. Every screen under here is one job, and a menu of
 * other places to go is what makes those screens hard for someone who opened
 * their phone to do one thing.
 */
export default async function MyMessLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The name on the roll, which is what the avatar shows. Matched on email the
  // same way every other student lookup is; `null` simply means no avatar.
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  const student = email
    ? await prisma.student.findFirst({
        where: { email, leftAt: null },
        select: { name: true },
        orderBy: { mess: { name: "asc" } },
      })
    : null;

  return (
    <div className="min-h-screen bg-light">
      <SkipLink />
      <MessNavbar name={student?.name} />
      <div id="main-content">{children}</div>
    </div>
  );
}
