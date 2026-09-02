import Link from "next/link";
import type { Metadata } from "next";

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
 * A plain brand bar and nothing else: every screen under here is one job — mark
 * a meal, see the food, see what is owed — and a menu of other places to go is
 * the thing that makes those screens hard for someone who opened the phone to
 * do one thing.
 */
export default function MyMessLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-light">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-md items-center px-4">
          <Link href="/" className="font-heading text-xl font-bold text-primary-strong">
            Aangan <span className="text-text-main">Mess</span>
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
