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

export type PrefillData = {
  title: string;
  displayPrice?: string | null;
  location?: string | null;
  landmark?: string | null;
  occupancyType?: string | null;
  genderPreference?: string | null;
  deposit?: number | null;
  foodType?: string | null;
  walkMinutes?: number | null;
  listingUrl: string;
};

/** Build the rich prefill message from a student to Aangan (Phase F1). */
export function buildPropertyPrefill(p: PrefillData): string {
  const lines: string[] = [
    'Namaskar, Aangan varun ha hostel/room baghitla —',
    '',
    p.title,
  ];

  if (p.displayPrice) lines.push(`Bhade: ${p.displayPrice}`);

  if (p.location || p.landmark) {
    const loc = [p.location, p.landmark].filter(Boolean).join(', ');
    lines.push(`Thikan: ${loc}`);
  }

  if (p.occupancyType || p.genderPreference) {
    const typeStr = [p.occupancyType, p.genderPreference].filter(Boolean).join(' · ');
    lines.push(`Type: ${typeStr}`);
  }

  if (p.deposit != null) lines.push(`Deposit: ${p.deposit}`);
  if (p.foodType) lines.push(`Jevan: ${p.foodType}`);
  if (p.walkMinutes != null) lines.push(`Chalat antar: ${p.walkMinutes} min`);

  lines.push('');
  if (p.listingUrl) lines.push(p.listingUrl);
  lines.push('');
  lines.push('Mala yaa baddal maahiti hawi aahe.');

  let text = lines.join('\n');
  
  // Android wa.me intents can silently fail on very long strings (usually ~2000 chars,
  // but playing it safe under 1000). Truncate the middle if needed.
  if (text.length > 800) {
    const end = '\n\nMala yaa baddal maahiti hawi aahe.';
    text = text.slice(0, 800 - end.length - 3) + '...' + end;
  }
  
  return text;
}
