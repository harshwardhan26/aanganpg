import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PWAPrompt } from "@/components/PWAPrompt";

/**
 * The room site's chrome — aanganpg.com and nothing else.
 *
 * This used to be part of the root layout, which meant every mess screen also
 * carried a navbar full of hostel links and a footer promising zero brokerage.
 * A route group changes no URL, so every page under here still answers exactly
 * where it did before.
 */
export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/*
        * Visually hidden until focused. A keyboard or screen-reader user
        * otherwise tabs through the whole navbar on every page before
        * reaching the rooms, which is the only thing they came for.
        */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-text-main focus:shadow-lg"
      >
        Skip to main content
      </a>
      <Navbar />
      <div id="main-content">{children}</div>
      <Footer />
      <PWAPrompt />
    </>
  );
}
