import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getBaseUrl } from "@/lib/url";

/**
 * Built to the room site's footer, in the mess site's own words.
 *
 * The columns, the dark ground, the logo above them — the same shape a person
 * sees on aanganpg.com, because it is the same company. What fills them is not:
 * there are no hostel links here.
 *
 * It also carries the plain statement of who runs this and what it never asks
 * for. Google flagged this host as a "deceptive page" and named no example; the
 * shape its classifier scores is a site asking for a Google sign-in while
 * showing no identity, no contact and no policy.
 */
export function MessFooter() {
  const phone = process.env.NEXT_PUBLIC_AANGAN_PHONE;
  const site = getBaseUrl();

  return (
    <footer className="mt-auto border-t border-border bg-dark text-light">
      <div className="mx-auto max-w-[var(--content-max)] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 text-white">
              <Logo height={32} />
              <span className="mt-0.5 text-xs font-semibold tracking-wide text-light/60">Mess</span>
            </Link>
            <p className="max-w-xs text-sm text-light/70">
              Mess and canteen management in Kolhapur. Attendance, fees and the daily menu, in
              one place.
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-heading font-semibold text-white">For students</h3>
            <ul className="space-y-1 text-sm text-light/70">
              <li className="py-2">Your mess adds your Gmail</li>
              <li className="py-2">Sign in with that same Gmail</li>
              <li className="py-2">Scan the paper at the counter</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-heading font-semibold text-white">For mess owners</h3>
            <ul className="space-y-1 text-sm text-light/70">
              {phone && (
                <li>
                  <a
                    href={`https://wa.me/${phone.replace(/\D/g, "")}`}
                    className="block py-2 transition-colors hover:text-white"
                  >
                    Talk to Aangan
                  </a>
                </li>
              )}
              {phone && (
                <li>
                  <a href={`tel:${phone}`} className="block py-2 transition-colors hover:text-white">
                    {phone}
                  </a>
                </li>
              )}
              <li>
                <a
                  href={`${site}/about`}
                  className="block py-2 transition-colors hover:text-white"
                >
                  About Aangan
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-heading font-semibold text-white">Legal</h3>
            <ul className="space-y-1 text-sm text-light/70">
              <li>
                <a href={`${site}/terms`} className="block py-2 transition-colors hover:text-white">
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href={`${site}/privacy`}
                  className="block py-2 transition-colors hover:text-white"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href={`${site}/terms`} className="block py-2 transition-colors hover:text-white">
                  Grievance Officer
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-light/20 pt-8 text-sm text-light/70">
          <p>
            Google signs you in. We never see your password, we take no payment here, and a
            student can sign in only if their mess has already added their email.
          </p>
          <p suppressHydrationWarning>
            &copy; {new Date().getFullYear()} Aangan, Kolhapur, Maharashtra, India.
          </p>
        </div>
      </div>
    </footer>
  );
}
