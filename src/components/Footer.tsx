"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { NAV_LINKS } from "@/lib/nav-links";

export function Footer() {
  const pathname = usePathname();
  const isListing = pathname?.startsWith('/pg/');

  return (
    <footer className={`bg-dark text-light border-t border-border mt-auto ${isListing ? 'pb-24 lg:pb-0' : ''}`}>
      <div className="mx-auto max-w-[var(--content-max)] px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link href="/" className="inline-block text-white">
              <Logo height={32} />
            </Link>
          </div>
          <div>
            <h3 className="font-heading font-semibold mb-4 text-white">Explore</h3>
            {/* The same four the navbar shows, from the same array — these used
                to be hand-written here with their own wording, which is how the
                footer ended up saying "Girls Hostels & Rooms" while the navbar
                said "Girls Hostels". About is footer-only, so it stays inline. */}
            <ul className="space-y-1 text-sm text-light/70">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="block py-2 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/about" className="block py-2 hover:text-white transition-colors">
                  About Aangan
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-heading font-semibold mb-4 text-white">Landlords</h3>
            <ul className="space-y-1 text-sm text-light/70">
              <li>
                <Link href="/list-your-pg" className="block py-2 hover:text-white transition-colors">
                  List your property
                </Link>
              </li>
              <li>
                <Link href="/verification" className="block py-2 hover:text-white transition-colors">
                  Guidelines
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-heading font-semibold mb-4 text-white">Legal</h3>
            <ul className="space-y-1 text-sm text-light/70">
              <li>
                <Link href="/terms" className="block py-2 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="block py-2 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="block py-2 hover:text-white transition-colors">
                  Grievance Officer
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-light/20 text-sm text-light/70 flex items-center justify-between">
          <p suppressHydrationWarning>&copy; {new Date().getFullYear()} Aangan. Students pay us nothing.</p>
        </div>
      </div>
    </footer>
  );
}
