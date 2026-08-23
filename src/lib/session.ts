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
