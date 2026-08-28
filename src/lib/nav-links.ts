/**
 * The four ways into the room list, defined once.
 *
 * These used to be hand-written in the navbar and again in the footer, and they
 * had already drifted: the navbar said "Girls Hostels" where the footer said
 * "Girls Hostels & Rooms". Two lists that are meant to be the same list are one
 * edit away from disagreeing, so there is now only one.
 *
 * Not shared with the homepage tiles or the college-page chips on purpose. The
 * tiles carry photos and their own descriptive wording, and the chips are
 * college-scoped (`?college=X&...`) — neither is this list with different CSS.
 */
export const NAV_LINKS = [
  { href: "/search", label: "All hostels" },
  { href: "/search?genderPreference=Female", label: "For Girls" },
  { href: "/search?genderPreference=Male", label: "For Boys" },
  // ponytail: "Mess" points at the hostels-that-include-a-mess filter, not at a
  // directory of messes. The label and the destination disagree slightly until
  // the nearby-messes-by-locality section exists; repoint this href when it does.
  { href: "/search?food=yes", label: "Mess" },
] as const;
