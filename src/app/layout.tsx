import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/auth/Providers";
import { PostHogProvider } from "@/components/PostHogProvider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: "Aangan — PG and student rooms in Kolhapur",
    template: "%s | Aangan",
  },
  description:
    "PGs, hostels and student rooms near every college in Kolhapur. Every one visited in " +
    "person and photographed by us. Contact owners directly. Students pay " +
    "no brokerage.",
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
          </Providers>
        </PostHogProvider>
      </body>
    </html>
  );
}
