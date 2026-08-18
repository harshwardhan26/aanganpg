import assert from "node:assert";
import { canonicalPhone } from "../src/lib/phone";
import { slugify } from "../src/lib/slug";
import { pgPublishIssues } from "../src/lib/property-options";
import { buildRoomWhere } from "../src/lib/room-filters";
import { cloudinaryUrl } from "../src/lib/image";

try { process.loadEnvFile(); } catch {}

// Convert hex string to RGB
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// Calculate relative luminance for contrast ratio
function relativeLuminance(rgb: { r: number; g: number; b: number }) {
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  const R = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const G = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const B = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

// Calculate contrast ratio
export function contrastRatio(hex1: string, hex2: string) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) throw new Error("Invalid hex");

  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);

  const lightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);

  return (lightest + 0.05) / (darkest + 0.05);
}

async function main() {
  const white = "#ffffff";
  const primary = "#fa5a5a";
  const primaryStrong = "#cc4040";
  const whatsapp = "#25d366";
  const whatsappDark = "#05391a";

  const ratio1 = contrastRatio(white, primaryStrong);
  assert(ratio1 >= 4.5, `white on ${primaryStrong} must be >= 4.5, got ${ratio1.toFixed(2)}`);

  const ratio2 = contrastRatio(white, primary);
  assert(ratio2 < 4.5, `white on ${primary} must be < 4.5, got ${ratio2.toFixed(2)}`);

  const ratio3 = contrastRatio(whatsappDark, whatsapp);
  assert(ratio3 >= 4.5, `${whatsappDark} on ${whatsapp} must be >= 4.5, got ${ratio3.toFixed(2)}`);

  // Phone round-trips
  assert(canonicalPhone("+91 98765 43210") === "+919876543210", "canonicalPhone failed for +91...");
  assert(canonicalPhone("098765-43210") === "+919876543210", "canonicalPhone failed for 098...");
  assert(canonicalPhone("919876543210") === "+919876543210", "canonicalPhone failed for 919...");
  assert(canonicalPhone("No phone") === null, "canonicalPhone failed for No phone");
  
  // Slug collision suffixing
  assert(slugify("My Room", "Nagala Park") === "my-room-nagala-park", "slugify basic failed");
  assert(slugify("My Room", "Nagala Park", 1) === "my-room-nagala-park-1", "slugify collision suffix failed");
  
  // Slugify on Marathi title
  assert(slugify("माझी खोली") === "majhii-kholii", "slugify Marathi transliteration failed");

  // pgPublishIssues tests
  const baseValid = {
    ownerPhone: "9876543210",
    images: Array(6).fill("img"),
    hasBathroomPhoto: true,
    hasThaliPhoto: true,
    foodType: "Veg",
    genderPreference: "Female",
    wardenName: "Mrs. Patil",
    gateClosingTime: "9:00 PM"
  };

  assert(pgPublishIssues(baseValid).length === 0, "Valid girls listing should pass");
  assert(pgPublishIssues({ ...baseValid, ownerPhone: null }).length > 0, "Missing phone should fail");
  assert(pgPublishIssues({ ...baseValid, images: [] }).length > 0, "Missing photos should fail");
  assert(pgPublishIssues({ ...baseValid, hasBathroomPhoto: false }).length > 0, "Missing bathroom photo should fail");
  assert(pgPublishIssues({ ...baseValid, hasThaliPhoto: false }).length > 0, "Missing thali photo should fail");
  assert(pgPublishIssues({ ...baseValid, wardenName: null }).length > 0, "Missing warden name should fail");
  assert(pgPublishIssues({ ...baseValid, gateClosingTime: null }).length > 0, "Missing gate time should fail");

  // The guard must fail CLOSED. It previously tested `=== false`, so a caller
  // that simply omitted the flag published a listing with no bathroom photo.
  assert(
    pgPublishIssues({ ...baseValid, hasBathroomPhoto: undefined }).length > 0,
    "Omitted bathroom flag must fail, not pass",
  );
  assert(
    pgPublishIssues({ ...baseValid, hasThaliPhoto: undefined }).length > 0,
    "Omitted thali flag must fail when a mess is claimed",
  );
  // No mess claimed, so no thali is required.
  assert(
    pgPublishIssues({ ...baseValid, foodType: null, hasThaliPhoto: undefined }).length === 0,
    "A room with no mess must not be asked for a thali photo",
  );

  // A closed listing still resolves, so buildRoomWhere is the only place that
  // hides them from lists.
  assert(buildRoomWhere({}).closedAt === null, "list queries must exclude closed rooms");

  // hasEvery, not hasSome.
  assert.deepStrictEqual(
    buildRoomWhere({ amenities: ["WiFi", "Hot Water"] }).amenities,
    { hasEvery: ["WiFi", "Hot Water"] },
    "amenities must use hasEvery",
  );

  // buildRoomWhere tests
  const query = buildRoomWhere({
    college: 'kit-college',
    genderPreference: 'Female',
    food: 'yes',
    maxPrice: 6000
  });

  assert((query.college as { slug: string }).slug === 'kit-college', "college slug query failed");
  assert.deepStrictEqual(query.genderPreference, { in: ["Female", "Any"] }, "gender OR query failed");
  assert.deepStrictEqual(query.foodType, { not: null }, "food not-null query failed");
  assert.deepStrictEqual(query.price, { lte: 6000 }, "maxPrice query failed");
  assert(query.deletedAt === null, "must exclude deleted");
  assert(query.closedAt === null, "must exclude closed");

  // cloudinaryUrl tests
  assert(cloudinaryUrl("https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg", 400) === "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_400/v1312461204/sample.jpg", "cloudinaryUrl rewrites properly");
  assert(cloudinaryUrl("https://example.com/image.jpg", 400) === "https://example.com/image.jpg", "cloudinaryUrl ignores non-cloudinary");

  console.log("Self check passed");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
