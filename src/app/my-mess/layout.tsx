import type { Metadata } from "next";
import { MessNavbar } from "@/components/mess/MessNavbar";

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
export default function MyMessLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-light">
      <MessNavbar />
      {children}
    </div>
  );
}
