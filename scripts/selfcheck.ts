import assert from "node:assert";
import { canonicalPhone } from "../src/lib/phone";
import { buildPropertyPrefill } from "../src/lib/whatsapp";
import { slugify, resolveSlug } from "../src/lib/slug";
import { pgPublishIssues } from "../src/lib/property-options";
import { buildRoomWhere, buildRoomOrderBy, parseRoomFilters } from "../src/lib/room-filters";
import { csvField, jsonLdScript } from "../src/lib/escape";
import { cloudinaryUrl } from "../src/lib/image";
import { publicImage } from "../src/lib/publicImage";
import { directionsUrl, looksLikeKolhapur } from "../src/lib/maps";
import { enquiryGate } from "../src/lib/session";
import { isAdminEmail, resolveRole, isOwner } from "../src/lib/admin";
import { trustedIp } from "../src/lib/request";
import { allowRequest } from "../src/lib/rate-limit";

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
  const brandCoral = "#fa5a5a";
  const primaryStrong = "#cc4040";
  const whatsapp = "#25d366";
  const whatsappDark = "#05391a";

  const ratio1 = contrastRatio(white, primaryStrong);
  assert(ratio1 >= 4.5, `white on ${primaryStrong} must be >= 4.5, got ${ratio1.toFixed(2)}`);

  const ratio2 = contrastRatio(white, brandCoral);
  assert(ratio2 < 4.5, `white on ${brandCoral} must be < 4.5, got ${ratio2.toFixed(2)}`);

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
  
  // Slug retention (pure logic test)
  assert(resolveSlug("existing-slug", "New Title", "New Locality") === "existing-slug", "resolveSlug must return existing slug unchanged");
  assert(resolveSlug(null, "New Title", "New Locality") === "new-title-new-locality", "resolveSlug must build new slug if no existing");
  
  // Slugify on Marathi title
  assert(slugify("माझी खोली") === "majhii-kholii", "slugify Marathi transliteration failed");

  // pgPublishIssues tests
  const baseValid = {
    ownerPhone: "9876543210",
    images: Array(6).fill("img"),
    hasBathroomPhoto: true,
    foodType: "Veg",
    genderPreference: "Female",
    wardenName: "Mrs. Patil",
    gateClosingTime: "9:00 PM"
  };

  assert(pgPublishIssues(baseValid).length === 0, "Valid girls listing should pass");
  assert(pgPublishIssues({ ...baseValid, ownerPhone: null }).length > 0, "Missing phone should fail");
  assert(pgPublishIssues({ ...baseValid, images: [] }).length > 0, "Missing photos should fail");
  assert(pgPublishIssues({ ...baseValid, hasBathroomPhoto: false }).length > 0, "Missing bathroom photo should fail");
  assert(pgPublishIssues({ ...baseValid, wardenName: null }).length > 0, "Missing warden name should fail");
  assert(pgPublishIssues({ ...baseValid, gateClosingTime: null }).length > 0, "Missing gate time should fail");

  // The guard must fail CLOSED. It previously tested `=== false`, so a caller
  // that simply omitted the flag published a listing with no bathroom photo.
  assert(
    pgPublishIssues({ ...baseValid, hasBathroomPhoto: undefined }).length > 0,
    "Omitted bathroom flag must fail, not pass",
  );
  // No mess claimed.
  assert(
    pgPublishIssues({ ...baseValid, foodType: null }).length === 0,
    "A room with no mess passes validation",
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

  const locQuery = buildRoomWhere({ location: 'Rajarampuri' });
  assert(locQuery.location === 'Rajarampuri', "location query failed");

  // buildRoomOrderBy tests
  const defaultSort = buildRoomOrderBy({});
  assert.deepStrictEqual(defaultSort, [{ verifiedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }], "default sort failed");

  const priceSort = buildRoomOrderBy({ sort: "price_asc" });
  assert.deepStrictEqual(priceSort, [{ price: "asc" }, { verifiedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }], "price sort failed");

  // cloudinaryUrl tests
  assert(cloudinaryUrl("https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg", 400) === "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_400/v1312461204/sample.jpg", "cloudinaryUrl rewrites properly");
  assert(cloudinaryUrl("https://example.com/image.jpg", 400) === "https://example.com/image.jpg", "cloudinaryUrl ignores non-cloudinary");

  // publicImage tests
  assert(publicImage("logo-icon.png") === "/logo-icon.png", "publicImage resolves an existing file");
  assert(publicImage("images/definitely-not-here.jpg") === null, "publicImage returns null for a missing file");

  // buildPropertyPrefill tests
  const prefill = buildPropertyPrefill({
    title: "Testing PG",
    deposit: null,
    foodType: null,
    listingUrl: "https://aangan.com/pg/testing-pg"
  });
  assert(!prefill.includes("Deposit:"), "Prefill should not include Deposit label if null");
  assert(!prefill.includes("Jevan:"), "Prefill should not include Jevan label if null");
  assert(prefill.includes("Testing PG"), "Prefill should include title");
  assert(prefill.includes("https://aangan.com/pg/testing-pg"), "Prefill should include URL");

  // Map utilities tests
  const url = directionsUrl(16.7, 74.2);
  assert(url !== null && url.includes("16.7") && url.includes("74.2"), "directionsUrl failed for valid Kolhapur pair");
  assert(directionsUrl(null, 74.2) === null, "directionsUrl failed for null lat");
  assert(directionsUrl(16.7, undefined) === null, "directionsUrl failed for undefined lng");
  assert(directionsUrl(0, 0) !== null, "directionsUrl failed to handle 0 as a real number");

  assert(looksLikeKolhapur(16.7, 74.2) === true, "looksLikeKolhapur failed for valid pair");
  assert(looksLikeKolhapur(74.2, 16.7) === false, "looksLikeKolhapur failed to catch swapped pair");

  // Enquiry gate tests
  assert(enquiryGate("unauthenticated", null) === "signin", "enquiryGate must ask a signed-out visitor to sign in");
  assert(enquiryGate("loading", "+919876543210") === "signin", "enquiryGate must not wave through a session still loading");
  assert(enquiryGate("authenticated", null) === "phone", "enquiryGate must ask a Google user with no number for one");
  assert(enquiryGate("authenticated", "not a number") === "phone", "enquiryGate must reject a stored value that is not dialable");
  assert(enquiryGate("authenticated", "+919876543210") === null, "enquiryGate must pass a signed-in user with a real number");

  // Admin allowlist tests
  const list = "hppatilhpp@gmail.com, second@aanganpg.com";
  assert(isAdminEmail("hppatilhpp@gmail.com", list) === true, "isAdminEmail must match the first entry");
  assert(isAdminEmail("second@aanganpg.com", list) === true, "isAdminEmail must match a later entry despite the space");
  assert(isAdminEmail("HPPatilHPP@Gmail.com", list) === true, "isAdminEmail must ignore case");
  assert(isAdminEmail("someone@gmail.com", list) === false, "isAdminEmail must reject an email not on the list");
  assert(isAdminEmail(null, list) === false, "isAdminEmail must reject a null email");
  assert(isAdminEmail("hppatilhpp@gmail.com", "") === false, "isAdminEmail must grant nobody when the allowlist is empty");
  assert(isAdminEmail("", list) === false, "isAdminEmail must reject an empty email against a non-empty list");

  // Role resolution. The point of these is the SECOND one: the old form read the
  // role back off the token it had written last request, so a revoked admin kept
  // admin until the JWT expired. resolveRole takes one input and has no memory.
  const prevAdmins = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = list;
  assert(resolveRole("hppatilhpp@gmail.com") === "admin", "resolveRole must grant admin to an allowlisted email");
  process.env.ADMIN_EMAILS = "second@aanganpg.com";
  assert(resolveRole("hppatilhpp@gmail.com") === "student", "resolveRole must revoke the moment the email leaves the allowlist");
  process.env.ADMIN_EMAILS = "";
  assert(resolveRole("hppatilhpp@gmail.com") === "student", "resolveRole must grant nobody when the allowlist is empty");
  assert(resolveRole(null) === "student", "resolveRole must reject a null email");
  process.env.ADMIN_EMAILS = prevAdmins;

  // Search filters must degrade, never throw. Every one of these used to be a
  // 500 on /search or an unbounded unstable_cache key.
  assert.deepStrictEqual(parseRoomFilters({ maxPrice: "abc" }).maxPrice, undefined, "a non-numeric maxPrice must drop, not throw");
  assert.deepStrictEqual(parseRoomFilters({ maxPrice: "6000" }).maxPrice, 6000, "a numeric maxPrice must survive as a number");
  assert.deepStrictEqual(parseRoomFilters({ maxPrice: "-5" }).maxPrice, undefined, "a negative maxPrice must drop");
  assert.deepStrictEqual(parseRoomFilters({ food: "maybe" }).food, undefined, "an off-menu food value must drop");
  assert.deepStrictEqual(parseRoomFilters({ food: "yes" }).food, "yes", "a valid food value must survive");
  assert.deepStrictEqual(parseRoomFilters({ genderPreference: "Other" }).genderPreference, undefined, "an unknown gender must drop");
  assert.deepStrictEqual(parseRoomFilters({ amenities: "Wifi" }).amenities, ["Wifi"], "a single amenity must become an array");
  assert.deepStrictEqual(parseRoomFilters({ amenities: ["Wifi", "Geyser"] }).amenities, ["Wifi", "Geyser"], "repeated amenities must stay an array");
  assert.deepStrictEqual(parseRoomFilters({ college: "x".repeat(500) }).college, undefined, "an oversized college must drop rather than become a cache key");
  assert.deepStrictEqual(parseRoomFilters({}), {
    college: undefined, location: undefined, genderPreference: undefined, maxPrice: undefined,
    food: undefined, occupancy: undefined, amenities: undefined, rules: undefined, sort: undefined,
  }, "an empty query must produce an empty filter set");

  // CSV export must not hand Excel a formula.
  assert(csvField("=cmd|'/c calc'!A1") === `"'=cmd|'/c calc'!A1"`, "csvField must neutralise a leading =");
  assert(csvField("+919876543210") === `"'+919876543210"`, "csvField must neutralise a leading + on a phone number");
  assert(csvField("-5") === `"'-5"`, "csvField must neutralise a leading -");
  assert(csvField("@handle") === `"'@handle"`, "csvField must neutralise a leading @");
  assert(csvField('Sai PG "Deluxe"') === `"Sai PG ""Deluxe"""`, "csvField must still double embedded quotes");
  assert(csvField("Rajarampuri") === `"Rajarampuri"`, "csvField must leave ordinary text alone");
  assert(csvField(null) === `""`, "csvField must render null as an empty field");
  assert(csvField(0) === `"0"`, "csvField must render 0, not an empty field");

  // JSON-LD must not be escapable out of its own script tag.
  assert(
    !jsonLdScript({ name: "PG</script><script>alert(1)</script>" }).includes("</script>"),
    "jsonLdScript must not let a title close the script tag",
  );
  assert.deepStrictEqual(
    JSON.parse(jsonLdScript({ name: "A<B" })),
    { name: "A<B" },
    "jsonLdScript must still parse back to the original object",
  );

  // Owner gate. Analytics is tighter than the admin panel, and the fallback
  // matters: a deploy with no OWNER_EMAIL must still resolve to a real person.
  assert(isOwner("first@aangan.com", undefined, "first@aangan.com, second@aangan.com") === true, "isOwner must fall back to the first ADMIN_EMAILS entry");
  assert(isOwner("second@aangan.com", undefined, "first@aangan.com, second@aangan.com") === false, "isOwner must not grant a later ADMIN_EMAILS entry");
  assert(isOwner("second@aangan.com", "second@aangan.com", "first@aangan.com") === true, "an explicit OWNER_EMAIL must win over the allowlist");
  assert(isOwner("SECOND@Aangan.com", "second@aangan.com") === true, "isOwner must ignore case");
  assert(isOwner(null, "second@aangan.com") === false, "isOwner must reject a null email");
  assert(isOwner("anyone@aangan.com", "", "") === false, "isOwner must grant nobody when neither value is set");

  // Trusted client IP. The rightmost hop is the one our own proxy appended; the
  // leftmost is whatever the caller typed, and keying a rate limit on it let
  // anyone mint a fresh bucket per request.
  assert(trustedIp({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.2.3.4, 5.6.7.8" }) === "9.9.9.9", "x-real-ip must win when present");
  assert(trustedIp({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }) === "5.6.7.8", "must take the rightmost forwarded hop, not the client-controlled first");
  assert(trustedIp({ "x-forwarded-for": "1.2.3.4" }) === "1.2.3.4", "a single hop is the only hop");
  assert(trustedIp({}) === "unknown", "no headers must collapse to one shared bucket, not a per-caller one");
  assert(trustedIp({ "x-forwarded-for": "  " }) === "unknown", "a blank forwarded header must not become a bucket key");

  // Rate limiting with no limiter configured. This is the branch that decides
  // whether a dropped Upstash env var quietly removes every brake on the site,
  // and it was the last piece of security-critical logic here with no assertion.
  // The production branch logs on purpose; muted here so a passing CI run does
  // not print something that reads like a real failure.
  const realError = console.error;
  console.error = () => {};
  const devAllows = await allowRequest(null, "k", false);
  const prodRefuses = await allowRequest(null, "k", true);
  console.error = realError;
  assert(devAllows === true, "no limiter in development must allow the request");
  assert(prodRefuses === false, "no limiter in production must REFUSE the request");

  // And with one: whatever the limiter says, unchanged.
  const yes = { limit: async () => ({ success: true }) } as unknown as Parameters<typeof allowRequest>[0];
  const no = { limit: async () => ({ success: false }) } as unknown as Parameters<typeof allowRequest>[0];
  assert((await allowRequest(yes, "k", true)) === true, "a limiter that allows must be obeyed");
  assert((await allowRequest(no, "k", false)) === false, "a limiter that refuses must be obeyed even in development");

  console.log("Self check passed");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
