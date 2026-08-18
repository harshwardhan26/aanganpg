/**
 * Click-to-chat links for contacting a lead.
 *
 * Uses wa.me, which is a plain URL scheme — no WhatsApp Business API, no Meta
 * business verification, no per-message cost. It opens a chat with the message
 * pre-typed; the agent still presses send.
 */

import { dialablePhone } from './phone';

const WA_BASE = 'https://wa.me';

/** Whether this lead can be contacted at all. */
export function isContactable(raw: string | null | undefined): boolean {
  return dialablePhone(raw) !== null;
}

/** `https://wa.me/91...?text=...`, or null when the number is unusable. */
export function whatsappLink(raw: string | null | undefined, message?: string): string | null {
  const phone = dialablePhone(raw);
  if (!phone) return null;
  return message ? `${WA_BASE}/${phone}?text=${encodeURIComponent(message)}` : `${WA_BASE}/${phone}`;
}

/** `tel:+91...`, or null. Agents still call as often as they message. */
export function telLink(raw: string | null | undefined): string | null {
  const phone = dialablePhone(raw);
  return phone ? `tel:+${phone}` : null;
}

/** Share text for sending a listing to someone on WhatsApp. */
export function shareListingMessage(opts: { title: string; displayPrice: string; location: string; url: string }): string {
  return `${opts.title}\n${opts.displayPrice} · ${opts.location}\n\n${opts.url}`;
}
