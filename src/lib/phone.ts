/**
 * The single definition of what a phone number looks like in this database.
 *
 * Before this module there were three formats in play for the same person:
 * the auth flow stored "+91 9876543210", the WhatsApp webhook stored
 * "919876543210", and the lead form stored whatever the buyer happened to type.
 * Nothing matched anything, so the dedupe lookups keyed on `phone` — the lead
 * form's (phone, propertyId) check and the webhook's 24-hour open-lead check —
 * silently missed and produced a second lead card for a buyer who already had
 * one. The webhook then greeted them again mid-conversation.
 *
 * One canonical form fixes all of those at once: E.164, `+919876543210`. It is
 * what `canonicalPhone` produces at every entry point, it is what the Meta API
 * expects give or take the plus, and it has exactly one spelling per number.
 *
 * Pure string work — no Node built-ins — so client components can import it too.
 */

/** E.164 for an Indian mobile: `+91` followed by 10 digits. */
const E164_IN = /^\+91[6-9]\d{9}$/;

/**
 * The bare 10-digit national number, or null if `raw` isn't an Indian mobile.
 *
 * Numbers arrive in every shape a human or an API can produce: "+91 98765 43210",
 * "098765-43210", "919876543210", and the literal "No phone" that the saved-property
 * flow falls back to when an account has no number on file.
 */
export function toLocalMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // Strip a country code or a trunk-dialling zero, leaving the national number.
  let local = digits;
  if (local.length === 12 && local.startsWith('91')) local = local.slice(2);
  else if (local.length === 11 && local.startsWith('0')) local = local.slice(1);
  else if (local.length === 13 && local.startsWith('091')) local = local.slice(3);

  // Indian mobiles are 10 digits beginning 6-9. Anything else is a landline, a
  // truncated entry, or not a number at all — none of which we can call or message.
  return /^[6-9]\d{9}$/.test(local) ? local : null;
}

/**
 * The form every `phone` column stores. Null when there is no usable number,
 * which callers must treat as "not contactable" rather than writing a placeholder.
 */
export function canonicalPhone(raw: string | null | undefined): string | null {
  const local = toLocalMobile(raw);
  return local ? `+91${local}` : null;
}

/** Whether `raw` is already stored in canonical form. Used by the migration check. */
export function isCanonicalPhone(raw: string): boolean {
  return E164_IN.test(raw);
}

/** `+91 98765 43210` — grouped for reading. Falls back to the raw string. */
export function displayPhone(raw: string | null | undefined): string {
  const local = toLocalMobile(raw);
  if (!local) return raw?.trim() || '';
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

/** `919876543210` — digits only, the form wa.me and the Meta Graph API want. */
export function dialablePhone(raw: string | null | undefined): string | null {
  const local = toLocalMobile(raw);
  return local ? `91${local}` : null;
}
