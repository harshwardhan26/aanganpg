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
        <PostHogProvider>
          <Providers>
            <Navbar />
            {children}
            <Footer />
            <PWAPrompt />
          </Providers>
        </PostHogProvider>
      </body>
    </html>
  );
}
