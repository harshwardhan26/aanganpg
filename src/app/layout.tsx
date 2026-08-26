import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/auth/Providers";
import { PostHogProvider } from "@/components/PostHogProvider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PWAPrompt } from "@/components/PWAPrompt";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body",
});

const poppinsHeading = Poppins({
  weight: ["600", "700"],
  subsets: ["latin"],
  variable: "--font-heading",
});

import { getBaseUrl } from "@/lib/url";

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: "Aangan — Hostels, Rooms and PGs in Kolhapur",
    template: "%s | Aangan",
  },
  description:
    "Hostels, Rooms and PGs near every college in Kolhapur. Every one visited in " +
    "person and photographed by us. Contact owners directly. Students pay " +
    "no brokerage.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Aangan",
  },
};

export const viewport: Viewport = {
  themeColor: "#fa5a5a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${poppinsHeading.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          <PostHogProvider>
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
          </PostHogProvider>
        </Providers>
      </body>
    </html>
  );
}
