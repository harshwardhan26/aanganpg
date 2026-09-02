/**
 * The two letters that stand in for a person.
 *
 * Extracted from the room site's navbar so the mess site cannot drift into a
 * different rule for the same avatar. The shapes it has to survive are real
 * ones from a roll typed by a mess owner: a single name, a name with a middle
 * name, extra spaces, and an empty box.
 *
 * A single-word name takes its first two letters rather than one, because one
 * letter in a circle reads as a placeholder rather than a person.
 */
export function initials(name: string | null | undefined): string {
  if (!name) return "";

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";

  // First and last, so "Harshwardhan Anil Patil" is HP, not HA.
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  const only = parts[0];
  if (only.length >= 2) return only[0].toUpperCase() + only[1].toLowerCase();
  return only.toUpperCase();
}
