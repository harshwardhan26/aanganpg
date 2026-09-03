/**
 * Hidden until it has keyboard focus, then the first thing on the page.
 *
 * Without it, somebody moving by keyboard tabs through the bar and the account
 * menu on every screen before reaching the one card they came for. The room
 * site has had this since it launched; the mess site was built without it.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-text-main focus:shadow-lg"
    >
      Skip to main content
    </a>
  );
}
