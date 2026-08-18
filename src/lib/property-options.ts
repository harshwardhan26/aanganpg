import { z } from 'zod';
import { dialablePhone } from './phone';

/**
 * Areas a room can be tagged with, shared by the admin form and anything that
 * displays a locality, so the two cannot drift into different spellings of the
 * same place. Keep alphabetical.
 *
 * Students search by college rather than by locality, so this is a listing-form
 * list rather than a search one.
 */
export const KOLHAPUR_LOCALITIES = [
  'Bapat Camp',
  'Hari Om Nagar',
  'Kadamwadi',
  'Kagal Road / MIDC',
  'Kalamba',
  'Kasaba Bawada',
  'Mangalwar Peth',
  'Nagala Park',
  'Padmaraje Park',
  'Phulewadi',
  'Pratibha Nagar',
  'Rajarampuri',
  'Rankala Lakefront',
  'Ruikar Colony',
  'Shahupuri',
  'Shalini Palace',
  'Shingnapur',
  'Subhash Nagar',
  'Tarabai Park',
  'Uchgaon',
] as const;

export const OCCUPANCY_TYPES = ['Single', 'Double', 'Triple', 'Shared'] as const;
export const GENDER_PREFERENCES = ['Any', 'Male', 'Female'] as const;
export const FOOD_TYPES = ['Veg', 'Non-veg', 'Both'] as const;

export const PG_AMENITIES = [
  'WiFi',
  'Mess / Food',
  'Hot Water',
  'RO Drinking Water',
  'Attached Bathroom',
  'Washing Machine',
  'CCTV',
  'Power Backup',
  'Two-wheeler Parking',
  'Study Table',
  'Cupboard',
  'Fridge',
  'Warden on site',
  'Lift'
] as const;

/**
 * House rules, stored in Property.rules.
 *
 * Deliberately no "Gate closes 10 PM" tags here: the gate time is its own field
 * (gateClosingTime), and having both produced a listing tagged "Gate closes
 * 10 PM" whose gate time said 9:30 PM. One fact, one place.
 */
export const PG_RULES = [
  'No smoking',
  'No alcohol',
  'Veg only',
  'No opposite-gender visitors',
  'Guests allowed with permission',
  'No loud music after 10 PM'
] as const;

/**
 * The standard shot list for a student room, in the order it is shot.
 * Used by the admin checklist.
 */
export const PG_SHOT_LIST = [
  'Building exterior, with the gate and the street',
  'Room — wide, lights on, curtains open',
  'Bathroom (required)',
  'Kitchen or mess, with a real thali if food is provided',
  'Water storage, RO point, hot water source',
  'Terrace, common area or study space',
  'Two-wheeler parking, and the walk out toward the college',
  'Owner or warden, with their permission',
] as const;

export const PG_MIN_PHOTOS = 6;

export function pgPublishIssues(v: {
  genderPreference?: string | null;
  images?: unknown[];
  hasBathroomPhoto?: boolean;
  hasThaliPhoto?: boolean;
  foodType?: string | null;
  wardenName?: string | null;
  gateClosingTime?: string | null;
  ownerPhone?: string | null;
}): string[] {
  const issues: string[] = [];

  if (!dialablePhone(v.ownerPhone)) {
    issues.push("Add the owner's mobile number — students call, and the listing has nothing to do without it.");
  }

  if ((v.images?.length ?? 0) < PG_MIN_PHOTOS) {
    issues.push(`A student room needs at least ${PG_MIN_PHOTOS} photos, including the bathroom — and a thali if food is provided.`);
  }

  // `!v.hasBathroomPhoto`, not `=== false`. With the strict comparison a caller
  // that simply omitted the flag sailed straight through, so the one rule this
  // whole product is built on failed open.
  if (!v.hasBathroomPhoto) {
    issues.push("No listing goes live without a bathroom photo. It is the shot everyone hides; showing it is the whole point.");
  }

  if (v.foodType && !v.hasThaliPhoto) {
    issues.push("A listing that claims a mess needs a photo of an actual thali.");
  }

  if (v.genderPreference === 'Female') {
    if (!v.wardenName?.trim()) issues.push("Girls' PG listings need the warden's name.");
    if (!v.gateClosingTime?.trim()) issues.push("Girls' PG listings need the gate closing time.");
  }

  return issues;
}

export const basePgSchema = z.object({
  genderPreference: z.string().nullable().optional(),
  images: z.array(z.unknown()).optional(),
  hasBathroomPhoto: z.boolean().optional(),
  hasThaliPhoto: z.boolean().optional(),
  foodType: z.string().nullable().optional(),
  wardenName: z.string().nullable().optional(),
  gateClosingTime: z.string().nullable().optional(),
  ownerPhone: z.string().nullable().optional(),
});

export const publishablePgSchema = basePgSchema.superRefine((data, ctx) => {
  const issues = pgPublishIssues(data);
  for (const issue of issues) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: issue,
    });
  }
});
