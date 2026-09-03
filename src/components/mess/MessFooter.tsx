import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { getBaseUrl } from "@/lib/url";

/**
 * The mess site's footer.
 *
 * Four link columns is a desktop pattern. On a phone they stack into fifteen
 * rows of identical grey text that nobody reads and everybody scrolls past —
 * and one of those columns was not even links, just sentences dressed as them.
 *
 * So: the brand and one real action, then a single wrapping row of the four
 * places a person might actually go. Five rows on a phone instead of fifteen.
 *
 * The identity stays in full — who runs this, where, a number that rings, and
 * the policies. Google flagged this host as a "deceptive page" and named no
 * example; a site asking for a Google sign-in while showing none of that is the
 * shape its classifier scores.
 */
const LEGAL = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/terms", label: "Grievance Officer" },
  { href: "/about", label: "About Aangan" },
];

export function MessFooter() {
  const phone = process.env.NEXT_PUBLIC_AANGAN_PHONE;
  const site = getBaseUrl();

  return (
    <footer className="mt-auto border-t border-light/10 bg-dark text-light">
      <div className="mx-auto max-w-[var(--content-max)] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5 text-white">
              <Logo height={30} />
              <span className="mt-0.5 text-xs font-semibold tracking-wide text-light/60">Mess</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-light/70">
              Mess and canteen management in Kolhapur — attendance, fees and the daily menu.
              Google signs you in; we never see your password and take no payment here.
            </p>
          </div>

          {/* No "Talk to Aangan" button here. The owner band sits directly above
              this footer and already carries one — the same button twice, a
              finger apart, reads as a mistake rather than an invitation. The
              number stays, because a footer is where a person looks for one. */}
          {phone && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold tracking-wide text-light/50 uppercase">
                Talk to us
              </p>
              <a
                href={`tel:${phone}`}
                className="inline-flex min-h-11 w-fit items-center gap-2 font-heading text-lg font-bold text-white transition-colors hover:text-light/80"
              >
                <MessageCircle className="h-4 w-4 shrink-0 text-light/60" aria-hidden />
                {phone}
              </a>
            </div>
          )}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-light/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {/* One wrapping row, not a column each. Every item keeps a 44px
              target — a footer link is the smallest thing on the page and the
              easiest to miss with a thumb. */}
          <ul className="flex flex-wrap items-center gap-x-5">
            {LEGAL.map(({ href, label }) => (
              <li key={label + href}>
                <a
                  href={`${site}${href}`}
                  className="flex min-h-11 items-center text-sm text-light/70 transition-colors hover:text-white"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>

          <p className="text-sm text-light/60" suppressHydrationWarning>
            &copy; {new Date().getFullYear()} Aangan, Kolhapur, India
          </p>
        </div>
      </div>
    </footer>
  );
}
