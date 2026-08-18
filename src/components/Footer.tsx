import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="bg-dark text-light border-t border-border mt-auto">
      <div className="mx-auto max-w-[var(--content-max)] px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link href="/" className="inline-block text-white">
              <Logo height={32} />
            </Link>
            <p className="text-light/70 text-sm max-w-xs">
              Students pay us nothing.
            </p>
          </div>
          <div>
            <h3 className="font-heading font-semibold mb-4 text-white">Explore</h3>
            <ul className="space-y-3 text-sm text-light/70">
              <li>
                <Link href="/search" className="hover:text-white transition-colors">
                  All rooms
                </Link>
              </li>
              <li>
                <Link href="/search?genderPreference=Female" className="hover:text-white transition-colors">
                  Girls PG
                </Link>
              </li>
              <li>
                <Link href="/search?genderPreference=Male" className="hover:text-white transition-colors">
                  Boys PG
                </Link>
              </li>
              <li>
                <Link href="/search?food=yes" className="hover:text-white transition-colors">
                  With mess
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-heading font-semibold mb-4 text-white">Landlords</h3>
            <ul className="space-y-3 text-sm text-light/70">
              <li>
                <Link href="/list-your-pg" className="hover:text-white transition-colors">
                  List your property
                </Link>
              </li>
              <li>
                <Link href="/verification" className="hover:text-white transition-colors">
                  Guidelines
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-heading font-semibold mb-4 text-white">Legal</h3>
            <ul className="space-y-3 text-sm text-light/70">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About Aangan
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-light/20 text-sm text-light/70 flex items-center justify-between">
          <p>&copy; {new Date().getFullYear()} Aangan. Students pay us nothing.</p>
        </div>
      </div>
    </footer>
  );
}
