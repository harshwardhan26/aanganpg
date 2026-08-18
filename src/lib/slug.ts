/**
 * Generates lowercase ASCII slugs for URLs.
 * Handles Devanagari input, punctuation, and repeated hyphens.
 */

const DEVANAGARI_MAP: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ii', 'उ': 'u', 'ऊ': 'uu',
  'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
  'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l', 'क्ष': 'ksh', 'ज्ञ': 'gy',
  'ा': 'a', 'ि': 'i', 'ी': 'ii', 'ु': 'u', 'ू': 'uu',
  'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  'ं': 'n', 'ः': 'h', '्': '', '़': '', 'ँ': 'n'
};

function transliterate(text: string): string {
  let result = '';
  for (const char of text) {
    result += DEVANAGARI_MAP[char] !== undefined ? DEVANAGARI_MAP[char] : char;
  }
  return result;
}

export function slugify(title: string, locality?: string | null, collisionIndex?: number): string {
  let combined = title;
  if (locality) {
    combined += ` ${locality}`;
  }
  
  // Transliterate devanagari to ascii
  combined = transliterate(combined);

  // Normalize Unicode to NFD, remove combining diacritical marks
  combined = combined.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let slug = combined
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');    // Trim hyphens from start and end

  // Fallback if the slug ends up empty
  if (!slug) {
    slug = 'listing';
  }

  if (collisionIndex && collisionIndex > 0) {
    slug += `-${collisionIndex}`;
  }

  return slug;
}
