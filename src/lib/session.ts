/**
 * What still stands between a student and contacting an owner.
 *
 * The sign-in gate exists for one reason: the lead record needs a phone number.
 * Google sign-in gives us an email and no phone, so being authenticated is no
 * longer enough — a signed-in student with no number on file is a lead we cannot
 * follow up, which is the whole point of the gate.
 *
 * Pure string work so client components can import it.
 */

import { toLocalMobile } from './phone';

export type EnquiryGate = 'signin' | 'phone' | null;

/** `null` means go ahead. Anything else is the step the auth sheet must show. */
export function enquiryGate(status: string, phone: string | null | undefined): EnquiryGate {
  if (status !== 'authenticated') return 'signin';
  if (!toLocalMobile(phone)) return 'phone';
  return null;
}

/**
 * Where to send someone after they sign in, as a path on this site or nothing.
 *
 * `proxy.ts` bounces a signed-out visitor to `/?callbackUrl=<where they wanted>`,
 * and that value is then handed to `signIn`. It arrives from the URL bar, so it
 * is attacker-controllable: a link to `/?callbackUrl=https://evil.example` would
 * otherwise walk a student off the site immediately after they authenticate,
 * onto a page that can be dressed up as ours.
 *
 * Only a path on this origin survives. Absolute URLs are accepted when their
 * origin matches — `proxy.ts` sends full URLs — and reduced to a path so nothing
 * downstream has to trust a host again. `origin` is a parameter rather than a
 * `window` read so this stays pure and testable.
 */
export function safeCallbackUrl(
  raw: string | null | undefined,
  origin: string,
): string | null {
  if (!raw) return null;

  // `//evil.example` is protocol-relative and leaves the site despite looking
  // like a path. Backslashes are normalised to slashes by some browsers, so
  // `/\evil.example` is the same trick wearing a different hat.
  if (raw.startsWith('//') || raw.includes('\\')) return null;

  if (raw.startsWith('/')) return raw;

  try {
    const url = new URL(raw);
    if (url.origin === origin) return `${url.pathname}${url.search}`;
  } catch {
    // Not a URL at all — a bare word, or something malformed. Refuse it.
  }
  return null;
}
