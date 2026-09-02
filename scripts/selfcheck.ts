import assert from "node:assert";
import { canonicalPhone } from "../src/lib/phone";
import { buildPropertyPrefill } from "../src/lib/whatsapp";
import { slugify, resolveSlug } from "../src/lib/slug";
import { pgPublishIssues, pgPublishIssueList } from "../src/lib/property-options";
import { buildRoomWhere, buildRoomOrderBy, parseRoomFilters } from "../src/lib/room-filters";
import { csvField, jsonLdScript } from "../src/lib/escape";
import { cloudinaryUrl } from "../src/lib/image";
import { publicImage } from "../src/lib/publicImage";
import { directionsUrl, looksLikeKolhapur } from "../src/lib/maps";
import { routeForHost, isMessHost } from "../src/lib/hosts";
import { onRollDuring } from "../src/lib/mess";
import { approximateLocation, distanceMetres } from "../src/lib/geo";
import { enquiryGate, safeCallbackUrl } from "../src/lib/session";
import { isAdminEmail, resolveRole, isOwner } from "../src/lib/admin";
import { trustedIp } from "../src/lib/request";
import { allowRequest } from "../src/lib/rate-limit";
import { parseLeadView, parseLeadKind, parseLeadGrouping, parseHostelSearch, buildLeadWhere, buildLeadOrderBy, groupByHostel, startOfIstDay, followupState } from "../src/lib/lead-filters";
import { parseListingView, parseListingSearch, buildListingWhere, listingStatus } from "../src/lib/listing-filters";
import { messRoleAllows, attendanceDay, recentDays, dayKey, studentFormIssues, attendanceSummary, msUntilNextIstDay, startOfIstMonth, monthKey, dueDate, shouldRemind, owesForMonth, mealAt, nearestMeal, MEAL_WINDOWS, menuFor, weekdayOf } from "../src/lib/mess";
import { overdueMessage } from "../src/lib/sms";
import { scanKey, scanKeyMatches } from "../src/lib/scan-key";

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

  // A room with no measured walk time is an unknown, not a zero-minute walk.
  assert.deepStrictEqual(
    buildRoomWhere({ maxWalk: 10 }).walkMinutes,
    { lte: 10 },
    "maxWalk must filter on walkMinutes",
  );
  const walkSort = buildRoomOrderBy({ sort: "walk_asc" });
  assert.deepStrictEqual(
    walkSort[0],
    { walkMinutes: { sort: "asc", nulls: "last" } },
    "walk sort must put unmeasured listings last, not first",
  );

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
    maxWalk: undefined,
    food: undefined, occupancy: undefined, amenities: undefined, rules: undefined, sort: undefined,
  }, "an empty query must produce an empty filter set");
  assert.deepStrictEqual(parseRoomFilters({ maxWalk: "abc" }).maxWalk, undefined, "a non-numeric maxWalk must drop, not throw");
  assert.deepStrictEqual(parseRoomFilters({ maxWalk: "10" }).maxWalk, 10, "a numeric maxWalk must survive as a number");
  assert.deepStrictEqual(parseRoomFilters({ maxWalk: "9999" }).maxWalk, undefined, "an oversized maxWalk must drop rather than mint a cache key");

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

  // --- Map pin blurring ---------------------------------------------------
  //
  // Signed-out visitors see an approximate pin. This is the gate that keeps
  // exact locations behind sign-in, so it gets asserted rather than eyeballed.
  const realLat = 16.6512;
  const realLng = 74.2543;

  // Deterministic: the same listing must land in the same wrong place every
  // time. A random offset per render makes pins jump on reload and reads as a
  // broken map rather than a private one.
  const first = approximateLocation("cm3abc123", realLat, realLng);
  const again = approximateLocation("cm3abc123", realLat, realLng);
  assert.deepStrictEqual(first, again, "the same listing must blur to the same point every time");

  // It must actually move. An offset of zero is a gate that looks shut.
  const moved = distanceMetres({ lat: realLat, lng: realLng }, first);
  assert(moved >= 150 && moved <= 350, `blur must land in the 150-350m band, got ${moved.toFixed(0)}m`);

  // Two listings must not share an offset, or a whole street shifts as one
  // block and the real positions are recoverable from the shape.
  const other = approximateLocation("cm3zzz999", realLat, realLng);
  assert(
    distanceMetres(first, other) > 1,
    "two different listings must blur in different directions",
  );

  // Nudging a pin must not push it out of Kolhapur — a 350m shift near the edge
  // of the box would put a marker somewhere the city is not.
  assert(
    looksLikeKolhapur(first.lat, first.lng),
    "a blurred pin must still sit inside the Kolhapur bounding box",
  );

  // Longitude degrees shrink with latitude; ignoring that skews every pin
  // east-west. At 16.7N the correction is ~4%, so a pure-east offset must still
  // measure the same distance as a pure-north one.
  for (const id of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
    const p = approximateLocation(id, realLat, realLng);
    const d = distanceMetres({ lat: realLat, lng: realLng }, p);
    assert(d >= 149 && d <= 351, `every blur stays in band, ${id} gave ${d.toFixed(0)}m`);
  }

  // --- Publish guard, tagged by field -------------------------------------
  //
  // `pgPublishIssues` must stay exactly the flattened `pgPublishIssueList`, or
  // the server action and the admin form start enforcing different rules.
  assert.deepStrictEqual(
    pgPublishIssues({ ...baseValid, ownerPhone: null, images: [] }),
    pgPublishIssueList({ ...baseValid, ownerPhone: null, images: [] }).map((i) => i.message),
    "pgPublishIssues must be pgPublishIssueList flattened to messages",
  );
  // The form maps field -> section; a mistagged issue scrolls to the wrong place.
  assert.deepStrictEqual(
    pgPublishIssueList({ ...baseValid, ownerPhone: null }).map((i) => i.field),
    ["ownerPhone"],
    "a missing phone is tagged ownerPhone",
  );
  assert.deepStrictEqual(
    pgPublishIssueList({ ...baseValid, hasBathroomPhoto: false }).map((i) => i.field),
    ["bathroomPhoto"],
    "a missing bathroom photo is tagged bathroomPhoto",
  );
  assert.deepStrictEqual(
    pgPublishIssueList({ ...baseValid, wardenName: null, gateClosingTime: null }).map((i) => i.field),
    ["wardenName", "gateClosingTime"],
    "girls-hostel rules are tagged to their own fields",
  );
  assert(
    pgPublishIssueList(baseValid).length === 0,
    "a publishable listing has no tagged issues either",
  );

  // --- Admin listing views ------------------------------------------------
  //
  // `all` must still hide soft-deleted rows. The old page ran findMany with no
  // where clause at all, so deleted listings sat in the list forever.
  assert(buildListingWhere("all", "").deletedAt === null, "the all view hides deleted listings");
  assert.deepStrictEqual(
    buildListingWhere("deleted", "").deletedAt,
    { not: null },
    "only the deleted view shows deleted listings",
  );
  assert(buildListingWhere("draft", "").verifiedAt === null, "a draft is an unverified listing");
  assert(buildListingWhere("full", "").vacantBeds === 0, "full means zero vacant beds");
  assert.deepStrictEqual(
    buildListingWhere("live", "").NOT,
    { vacantBeds: 0 },
    "a full listing is not live",
  );
  assert(parseListingSearch("  Muktai  ") === "Muktai", "search is trimmed at the parse step");
  assert.deepStrictEqual(
    buildListingWhere("all", parseListingSearch("  Muktai  ")).title,
    { contains: "Muktai", mode: "insensitive" },
    "search is case-insensitive",
  );
  assert(buildListingWhere("all", "").title === undefined, "an empty search adds no clause");
  assert(parseListingView("nonsense") === "all", "an unknown listing view falls back to all");
  assert(parseListingSearch("x".repeat(500)) === "", "an over-long search is dropped, not truncated blindly");

  // Badge precedence: a deleted listing is also closed, and showing both says
  // nothing. Most severe wins.
  const dates = { closedAt: new Date(), verifiedAt: new Date(), deletedAt: new Date() };
  assert(listingStatus({ ...dates, vacantBeds: 0 }) === "deleted", "deleted beats everything");
  assert(listingStatus({ ...dates, deletedAt: null, vacantBeds: 0 }) === "closed", "closed beats full");
  assert(
    listingStatus({ deletedAt: null, closedAt: null, verifiedAt: new Date(), vacantBeds: 0 }) === "full",
    "full beats draft",
  );
  assert(
    listingStatus({ deletedAt: null, closedAt: null, verifiedAt: null, vacantBeds: 3 }) === "draft",
    "unverified with beds free is a draft",
  );
  assert(
    listingStatus({ deletedAt: null, closedAt: null, verifiedAt: new Date(), vacantBeds: 3 }) === "live",
    "verified with beds free is live",
  );
  // vacantBeds null means "ask Aangan", not zero. Treating it as full would hide
  // every listing whose bed count was never filled in.
  assert(
    listingStatus({ deletedAt: null, closedAt: null, verifiedAt: new Date(), vacantBeds: null }) === "live",
    "an unknown bed count is not full",
  );

  // --- Admin lead inbox ---------------------------------------------------
  //
  // The follow-up boundary is UTC midnight because that is how the date input
  // writes it. Asserted with a fixed IST-evening instant: with a *local*
  // midnight, "2026-08-26T20:00:00+05:30" and a follow-up dated 2026-08-26 land
  // on opposite sides of the boundary and a lead due today reads as overdue.
  const istEvening = new Date("2026-08-26T14:30:00.000Z"); // 20:00 IST
  assert(
    startOfIstDay(istEvening).toISOString() === "2026-08-26T00:00:00.000Z",
    "startOfIstDay must snap to UTC midnight of the IST date",
  );

  // The instant that actually caught the bug. 02:00 IST on the 27th is still
  // 20:30 UTC on the 26th, so picking the day off the UTC clock returns the
  // 26th — and the follow-up queue spends every day from midnight to 05:30 IST
  // showing yesterday's calls and hiding today's.
  const istEarlyMorning = new Date("2026-08-26T20:30:00.000Z"); // 02:00 IST, 27 Aug
  assert(
    startOfIstDay(istEarlyMorning).toISOString() === "2026-08-27T00:00:00.000Z",
    "before 05:30 IST the day is still taken from the Kolhapur calendar, not the UTC one",
  );
  assert(
    followupState(new Date("2026-08-27"), "NEW", istEarlyMorning) === "today",
    "a follow-up dated today is due today at 02:00 IST",
  );
  assert(
    followupState(new Date("2026-08-26"), "NEW", istEarlyMorning) === "overdue",
    "a follow-up dated yesterday is overdue at 02:00 IST",
  );

  const dueToday = new Date("2026-08-26");
  const dueYesterday = new Date("2026-08-25");
  const dueTomorrow = new Date("2026-08-27");
  assert(followupState(dueToday, "NEW", istEvening) === "today", "same-date follow-up is due today");
  assert(followupState(dueYesterday, "NEW", istEvening) === "overdue", "past follow-up is overdue");
  assert(followupState(dueTomorrow, "NEW", istEvening) === "upcoming", "future follow-up is upcoming");
  assert(followupState(null, "NEW", istEvening) === "none", "no follow-up date is not work");
  // A won or lost lead is not chased, whatever date is on it.
  assert(followupState(dueYesterday, "CONVERTED", istEvening) === "none", "converted leads are never overdue");
  assert(followupState(dueYesterday, "LOST", istEvening) === "none", "lost leads are never overdue");

  // A hand-edited ?view= must render the inbox, never throw.
  assert(parseLeadView("overdue") === "overdue", "a known view survives parsing");
  assert(parseLeadView("CONVERTED") === "CONVERTED", "stage views come from LEAD_STAGES");
  assert(parseLeadView("'; DROP TABLE") === "all", "an unknown view falls back to all");
  assert(parseLeadView(undefined) === "all", "a missing view falls back to all");

  // Every view is scoped to one kind. Without this the Students tab shows the
  // hostel owners you are pitching, and the Owners tab shows student enquiries.
  assert(buildLeadWhere("all", istEvening).kind === "student", "the default kind is student");
  assert(buildLeadWhere("all", istEvening, "owner").kind === "owner", "owner views are scoped to owners");
  assert(buildLeadWhere("overdue", istEvening, "owner").kind === "owner", "so is the overdue queue");
  assert(buildLeadWhere("NEW", istEvening, "owner").kind === "owner", "so are the stage views");
  // `all` must add nothing beyond the kind, or it silently hides leads.
  assert.deepStrictEqual(
    Object.keys(buildLeadWhere("all", istEvening)),
    ["kind"],
    "the all view filters on nothing but kind",
  );
  assert(parseLeadKind("owner") === "owner", "a known kind survives parsing");
  assert(parseLeadKind("../../etc") === "student", "an unknown kind falls back to student");
  assert(parseLeadGrouping("hostel") === "hostel", "a known grouping survives parsing");
  assert(parseLeadGrouping(undefined) === "date", "the default grouping is by date");

  // Grouping by hostel has to override the date order, or the rows arrive
  // interleaved and the consecutive-run grouping below produces one group per
  // lead instead of one per hostel.
  assert(
    buildLeadOrderBy("overdue", "hostel")[0].property?.title === "asc",
    "the hostel view sorts by hostel first, even in the overdue queue",
  );

  // groupByHostel gathers consecutive runs. A hostel split across a page
  // boundary simply shows its heading again, which is the correct behaviour.
  const p1 = { id: "p1", title: "Muktai" };
  const p2 = { id: "p2", title: "Rudra" };
  const groups = groupByHostel([
    { property: p1 }, { property: p1 }, { property: p2 }, { property: null },
  ]);
  assert.deepStrictEqual(
    groups.map((g) => [g.title, g.leads.length]),
    [["Muktai", 2], ["Rudra", 1], ["No hostel", 1]],
    "leads are gathered one group per hostel, with a home for the property-less",
  );
  assert.deepStrictEqual(groupByHostel([]), [], "an empty list groups to nothing");

  // Hostel-name search. Matches the property a student enquired about, so a
  // lead with no property correctly drops out of a search.
  assert(parseHostelSearch("  Muktai  ") === "Muktai", "a hostel search is trimmed");
  assert(parseHostelSearch("x".repeat(500)) === "", "an over-long hostel search is dropped");
  assert(parseHostelSearch(undefined) === "", "a missing hostel search is empty");
  assert.deepStrictEqual(
    buildLeadWhere("all", istEvening, "student", "Muktai").property,
    { title: { contains: "Muktai", mode: "insensitive" } },
    "the search filters on the hostel's title, case-insensitively",
  );
  assert(
    buildLeadWhere("all", istEvening, "student", "").property === undefined,
    "an empty search adds no clause",
  );
  // The search has to survive the follow-up queues, not just the inbox.
  assert(
    buildLeadWhere("overdue", istEvening, "student", "Muktai").property !== undefined,
    "searching still applies inside the overdue queue",
  );
  assert(
    buildLeadWhere("NEW", istEvening, "student", "Muktai").stage === "NEW",
    "searching does not clobber the stage filter",
  );
  assert(
    buildLeadOrderBy("overdue")[0].followupDate === "asc",
    "the follow-up queue is ordered by when the call is due",
  );
  assert(
    buildLeadOrderBy("all")[0].createdAt === "desc",
    "the inbox is ordered newest first",
  );

  // --- Admin palette ------------------------------------------------------
  //
  // Contrast is a build rule, and the admin palette had never been through it.
  // Stage badges are small text, so 4.5:1 applies to every pair.
  //
  // These are Tailwind v4's own palette converted from oklch to sRGB — NOT the
  // v3 hexes, which are close enough to look right and wrong enough to make this
  // assertion a lie (v4 amber-900 is #7b3306; the v3 hex was #78350f). Source of
  // truth is `node_modules/tailwindcss/theme.css`. If a Tailwind upgrade shifts
  // the palette, re-derive these rather than nudging the threshold.
  const adminPairs: [string, string, string][] = [
    ["#1c398e", "#dbeafe", "NEW badge (blue-900 on blue-100)"],
    ["#7b3306", "#fef3c6", "CONTACTED badge (amber-900 on amber-100)"],
    ["#59168b", "#f3e8ff", "VISITED badge (purple-900 on purple-100)"],
    ["#0d542b", "#dcfce7", "CONVERTED badge (green-900 on green-100)"],
    ["#1d293d", "#e2e8f0", "LOST badge (slate-800 on slate-200)"],
    ["#82181a", "#ffe2e2", "overdue count pill (red-900 on red-100)"],
    ["#c10007", white, "OVERDUE label (red-700 on white)"],
    ["#bb4d00", white, "DUE TODAY label (amber-700 on white)"],
    ["#016630", white, "Saved confirmation (green-800 on white)"],
    // Listing status badges and their siblings.
    ["#7e2a0c", "#ffedd4", "Full badge / Low pill (orange-900 on orange-100)"],
    ["#312c85", "#eef2ff", "Review code button (indigo-900 on indigo-50)"],
  ];
  for (const [fg, bg, what] of adminPairs) {
    const r = contrastRatio(fg, bg);
    assert(r >= 4.5, `${what} must be >= 4.5, got ${r.toFixed(2)}`);
  }

  // --- Mess module ------------------------------------------------------

  // An owner outranks staff; staff never reaches owner-only work; and no
  // membership at all is a refusal rather than a default role.
  assert(messRoleAllows("OWNER", "STAFF"), "owner must pass a staff check");
  assert(messRoleAllows("OWNER", "OWNER"), "owner must pass an owner check");
  assert(messRoleAllows("STAFF", "STAFF"), "staff must pass a staff check");
  assert(!messRoleAllows("STAFF", "OWNER"), "staff must NOT pass an owner check");
  assert(!messRoleAllows(null, "STAFF"), "a non-member must not pass any check");

  // The IST boundary, which decides what "today" means at the mess door.
  // 18:45 UTC is already the next day in IST (00:15 IST), and filing that scan
  // under the UTC date would put the evening rush on the wrong day.
  assert.equal(
    attendanceDay(new Date("2026-09-02T18:45:00Z")).toISOString(),
    "2026-09-03T00:00:00.000Z",
    "after 18:30 UTC the mess day must have rolled over in IST",
  );
  assert.equal(
    attendanceDay(new Date("2026-09-02T18:15:00Z")).toISOString(),
    "2026-09-02T00:00:00.000Z",
    "before 18:30 UTC the mess day must still be the same IST day",
  );

  // The kiosk's reload timer. A minute before the boundary must be a minute,
  // not a negative number (which fires instantly, forever) and not 24 hours
  // (which skips the rollover the tablet was left running for).
  assert.equal(
    msUntilNextIstDay(new Date("2026-09-02T18:29:00Z")),
    60_000,
    "one minute before IST midnight must be one minute",
  );
  assert.equal(
    msUntilNextIstDay(new Date("2026-09-02T18:31:00Z")),
    24 * 60 * 60 * 1000 - 60_000,
    "just after IST midnight must be nearly a full day, never zero or less",
  );

  const strip = recentDays(new Date("2026-09-02T12:00:00Z"), 14);
  assert.equal(strip.length, 14, "the strip must have as many days as asked for");
  assert.equal(dayKey(strip[13]), "2026-09-02", "the strip must end today");
  assert.equal(dayKey(strip[0]), "2026-08-20", "the strip must start 13 days back");

  // A zero fee is a real answer (a student who eats free) and must survive the
  // form. This is the `Number(x) || fallback` trap the house rules name.
  assert.deepEqual(
    studentFormIssues({ name: "Aditi", monthlyFee: 0, parentPhone: null, parentPhoneRaw: "" }),
    [],
    "a fee of 0 must be accepted, not read as missing",
  );
  assert.equal(
    studentFormIssues({ name: "", monthlyFee: 3000, parentPhone: null, parentPhoneRaw: "" }).length,
    1,
    "a nameless student must be refused",
  );
  assert.equal(
    studentFormIssues({ name: "Aditi", monthlyFee: null, parentPhone: null, parentPhoneRaw: "12" })
      .length,
    1,
    "a typed number that is not a mobile number must be refused",
  );
  assert.deepEqual(
    studentFormIssues({ name: "Aditi", monthlyFee: null, parentPhone: null, parentPhoneRaw: "" }),
    [],
    "an empty parent phone is allowed — not every student has one on file",
  );

  // Email shape. `gmai.com` is deliberately NOT caught: it is a valid address at
  // a domain that exists, and pretending otherwise would reject real ones.
  const withEmail = (email: string) =>
    studentFormIssues({ name: "Aditi", monthlyFee: null, parentPhone: null, parentPhoneRaw: "", email });
  assert.deepEqual(withEmail("aditi@gmail.com"), [], "a real address passes");
  assert.deepEqual(withEmail(""), [], "no email is allowed — the app is optional for a student");
  assert.equal(withEmail("aditi").length, 1, "a bare word is not an address");
  assert.equal(withEmail("aditi@gmail").length, 1, "an address with no dotted domain is refused");
  assert.deepEqual(withEmail("aditi@gmai.com"), [], "a plausible typo cannot be caught here");

  // An empty mess divides by zero unless the summary guards it.
  assert.deepEqual(attendanceSummary(0, 0), { present: 0, absent: 0, percent: 0 });
  assert.deepEqual(attendanceSummary(150, 200), { present: 150, absent: 50, percent: 75 });

  // --- Sign-in redirect ----------------------------------------------------

  const site = "https://www.aanganpg.com";

  // The ordinary case: a student scanning the mess poster is bounced here by
  // proxy.ts and must land back on the receipt, not the home page.
  assert.equal(
    safeCallbackUrl("/mess/abc123/scan", site),
    "/mess/abc123/scan",
    "a path on this site must survive",
  );
  assert.equal(
    safeCallbackUrl(`${site}/mess/abc123/scan?x=1`, site),
    "/mess/abc123/scan?x=1",
    "an absolute URL on this origin is reduced to its path",
  );

  // Everything below is an open redirect if it gets through: the value comes
  // from the URL bar, so a crafted link would walk a signed-in student straight
  // onto someone else's page.
  assert.equal(safeCallbackUrl("https://evil.example/x", site), null, "another origin is refused");
  assert.equal(safeCallbackUrl("//evil.example", site), null, "protocol-relative is refused");
  assert.equal(safeCallbackUrl("/\\evil.example", site), null, "backslash trick is refused");
  assert.equal(safeCallbackUrl("javascript:alert(1)", site), null, "a script URL is refused");
  assert.equal(safeCallbackUrl(null, site), null, "nothing means nothing");
  assert.equal(safeCallbackUrl("", site), null, "an empty string means nothing");

  // --- Meals ---------------------------------------------------------------

  // IST, not UTC. 03:00 UTC is 08:30 IST — breakfast — and reading the UTC hour
  // would file it under nothing at all.
  assert.equal(mealAt(new Date("2026-09-02T03:00:00Z")), "BREAKFAST", "08:30 IST is breakfast");
  assert.equal(mealAt(new Date("2026-09-02T07:30:00Z")), "LUNCH", "13:00 IST is lunch");
  assert.equal(mealAt(new Date("2026-09-02T15:00:00Z")), "DINNER", "20:30 IST is dinner");

  // Between meals is null, not the nearest guess. A scan at 5pm must be refused,
  // or one scan covers a dinner the student never came to.
  assert.equal(mealAt(new Date("2026-09-02T11:30:00Z")), null, "17:00 IST is between meals");
  assert.equal(mealAt(new Date("2026-09-02T20:00:00Z")), null, "01:30 IST is between meals");

  // Window edges: a meal starts at its `from` and has ended by its `to`.
  assert.equal(mealAt(new Date("2026-09-02T05:30:00Z")), "LUNCH", "11:00 IST starts lunch");
  assert.equal(mealAt(new Date("2026-09-02T10:29:00Z")), "LUNCH", "15:59 IST is still lunch");
  assert.equal(mealAt(new Date("2026-09-02T10:30:00Z")), null, "16:00 IST is after lunch");

  // Windows must not overlap, or one moment would belong to two meals and which
  // one a scan lands in would depend on array order.
  for (let i = 1; i < MEAL_WINDOWS.length; i++) {
    assert(
      MEAL_WINDOWS[i].from >= MEAL_WINDOWS[i - 1].to,
      `${MEAL_WINDOWS[i].meal} must start after ${MEAL_WINDOWS[i - 1].meal} ends`,
    );
  }

  // The staff screen always has a meal selected, even between meals.
  assert.equal(nearestMeal(new Date("2026-09-02T11:30:00Z")), "DINNER", "5pm points at dinner next");
  assert.equal(nearestMeal(new Date("2026-09-02T00:30:00Z")), "BREAKFAST", "6am points at breakfast");
  assert.equal(nearestMeal(new Date("2026-09-02T20:00:00Z")), "BREAKFAST", "1:30am points at breakfast");

  // --- Scan key ------------------------------------------------------------

  // Needs a secret to exist; in CI without one, this block has nothing to prove.
  if (process.env.NEXTAUTH_SECRET) {
    const messA = "cmtjowvq10000in2zh9alxwo6";
    const messB = "cmtjowvq10000in2zh9alxwo7";

    // Stable, or every poster already printed stops working on the next deploy.
    assert.equal(scanKey(messA), scanKey(messA), "the key for one mess must not change");
    assert.notEqual(scanKey(messA), scanKey(messB), "two messes must not share a key");
    assert(scanKeyMatches(messA, scanKey(messA)), "a mess's own key must be accepted");

    // The whole point: opening the scan page without the poster's key marks
    // nothing, so a student cannot mark a meal from their bed.
    assert(!scanKeyMatches(messA, undefined), "no key must be refused");
    assert(!scanKeyMatches(messA, ""), "an empty key must be refused");
    assert(!scanKeyMatches(messA, scanKey(messB)), "another mess's key must be refused");
    assert(!scanKeyMatches(messA, "abc"), "a short wrong key must be refused, not crash");
  }

  // --- Menu ----------------------------------------------------------------

  // 2 Sept 2026 is a Wednesday.
  const wednesday = new Date("2026-09-02T00:00:00Z");
  assert.equal(weekdayOf(wednesday), 3, "weekday must be 0=Sunday..6=Saturday");

  const menu = [
    { weekday: 3, date: null, meal: "LUNCH" as const, items: "Rajma, rice" },
    { weekday: 3, date: null, meal: "DINNER" as const, items: "Paneer, roti" },
    { weekday: 4, date: null, meal: "LUNCH" as const, items: "Chole, rice" },
  ];

  assert.equal(menuFor(menu, wednesday, "LUNCH"), "Rajma, rice", "the weekly row for that day wins");
  assert.equal(
    menuFor(menu, wednesday, "BREAKFAST"),
    null,
    "an unset meal is null, not an empty string",
  );

  // A one-off row for the exact date beats the rotation — writing one is how a
  // festival or a special gets said, and the rotation must not overrule it.
  const withOverride = [
    ...menu,
    { weekday: null, date: wednesday, meal: "LUNCH" as const, items: "Puran poli" },
  ];
  assert.equal(
    menuFor(withOverride, wednesday, "LUNCH"),
    "Puran poli",
    "a date override must beat the weekly rotation",
  );
  assert.equal(
    menuFor(withOverride, new Date("2026-09-09T00:00:00Z"), "LUNCH"),
    "Rajma, rice",
    "the override applies to its own date only, not every Wednesday",
  );

  // --- Fees and reminders ------------------------------------------------

  const sept = new Date("2026-09-15T12:00:00Z");
  assert.equal(monthKey(startOfIstMonth(sept)), "2026-09", "the billing month is the IST month");

  // A due day past the end of a short month lands on the last day of it, not in
  // the next one. February at dueDay 31 must still be chased in February.
  assert.equal(
    dueDate(new Date("2026-02-01T00:00:00Z"), 31).toISOString().slice(0, 10),
    "2026-02-28",
    "a due day past month end must clamp to month end, not spill over",
  );
  assert.equal(
    dueDate(new Date("2026-09-01T00:00:00Z"), 5).toISOString().slice(0, 10),
    "2026-09-05",
    "an ordinary due day is that day",
  );

  const due = new Date("2026-09-05T00:00:00Z");
  const base = { due, paid: false, remindersSent: 0, lastReminderAt: null };

  // Due today is late; the day before is not. The fee is due ON the date, so
  // texting a parent that morning would be chasing them early.
  assert(shouldRemind({ ...base, today: due }), "due date itself must send the first reminder");
  assert(
    !shouldRemind({ ...base, today: new Date("2026-09-04T00:00:00Z") }),
    "the day before the due date must send nothing",
  );
  assert(
    !shouldRemind({ ...base, today: new Date("2026-09-20T00:00:00Z"), paid: true }),
    "a paid month must never be chased",
  );

  // The gap, and the hard stop. Without the stop a single unpaid month texts a
  // parent every day until they pay.
  const afterFirst = { ...base, remindersSent: 1, lastReminderAt: new Date("2026-09-05T10:00:00Z") };
  assert(
    !shouldRemind({ ...afterFirst, today: new Date("2026-09-09T00:00:00Z") }),
    "a second reminder inside the gap must be refused",
  );
  assert(
    shouldRemind({ ...afterFirst, today: new Date("2026-09-10T00:00:00Z") }),
    "a second reminder is due five days after the first",
  );
  assert(
    !shouldRemind({
      ...afterFirst,
      remindersSent: 2,
      today: new Date("2026-10-30T00:00:00Z"),
    }),
    "reminders must stop after two, however overdue it gets",
  );

  // Who is chased at all. A zero fee is a real answer — a student who eats free
  // is never overdue — and a student who joined after the due date is not
  // chased for a month they were barely there for.
  const owesBase = { joinedAt: new Date("2026-08-01T00:00:00Z"), leftAt: null, due };
  assert(owesForMonth({ ...owesBase, monthlyFee: 3000 }), "an ordinary fee is owed");
  assert(!owesForMonth({ ...owesBase, monthlyFee: 0 }), "a free student is never overdue");
  assert(!owesForMonth({ ...owesBase, monthlyFee: null }), "no fee on file means nothing to chase");
  assert(
    !owesForMonth({ ...owesBase, monthlyFee: 3000, joinedAt: new Date("2026-09-20T00:00:00Z") }),
    "a student who joined after the due date is not chased for that month",
  );

  // The message itself — the only text this business sends a parent unprompted.
  const message = overdueMessage({
    studentName: "Aditi Patil",
    amount: 3000,
    monthLabel: "September 2026",
    messName: "Harsh Mess",
  });
  assert(message.includes("Aditi Patil"), "the message must name the student");
  assert(message.includes("Rs 3000"), "the message must carry the amount");
  assert(message.includes("Harsh Mess"), "the message must say who is asking");
  assert(!/https?:\/\//.test(message), "the message must carry no link — a link reads as a scam");

  // Mess UI pairs, same >= 4.5:1 rule as the admin ones above.
  const messPairs: [string, string, string][] = [
    ["#cc4040", white, "mess stat number (primary-strong on white)"],
    ["#82181a", "#ffe2e2", "check-in save failure (red-900 on red-100)"],
    ["#0d542b", "#dcfce7", "student added confirmation (green-900 on green-100)"],
    // Deepened from red-700 for the older eyes this dashboard is built for:
    // "not paid" and "no phone number" are the two lines the owner must not
    // misread, and red-700 on white was only just over the line.
    ["#9f0712", white, "unpaid fee marker (red-800 on white)"],
    ["#973c00", white, "missing parent phone warning (amber-800 on white)"],
    ["#016630", white, "menu slot saved (green-800 on white)"],
  ];
  for (const [fg, bg, what] of messPairs) {
    const r = contrastRatio(fg, bg);
    assert(r >= 4.5, `${what} must be >= 4.5, got ${r.toFixed(2)}`);
  }

  // ---- two sites, one deployment -----------------------------------------
  // `routeForHost` decides on every request which product a visitor is looking
  // at. Getting it wrong does not degrade a page, it takes a whole host down —
  // so the interesting cases are written here rather than clicked through.
  const HOSTS = { main: "https://aanganpg.com", mess: "https://mess.aanganpg.com" };
  const route = (host: string, path: string) => routeForHost(host, path, HOSTS);

  assert(isMessHost("mess.aanganpg.com"), "the mess host is the mess host");
  assert(isMessHost("mess.localhost:3000"), "dev mess host, port and all");
  assert(!isMessHost("aanganpg.com"), "the room site is not the mess host");
  assert(!isMessHost("localhost:3000"), "bare localhost is the room site");
  // The one that would hurt: a host merely containing the word.
  assert(!isMessHost("aanganpg.com.mess.evil.com"), "suffix match is not a prefix match");

  assert.deepEqual(
    route("mess.aanganpg.com", "/"),
    { kind: "rewrite", to: "/mess-home" },
    "the mess front door lands on the role router",
  );
  assert.deepEqual(
    route("mess.aanganpg.com", "/admin"),
    { kind: "rewrite", to: "/mess-admin" },
    "the mess host's /admin is the mess console",
  );
  // The two products both call it "admin". They must never be the same screen.
  assert.deepEqual(route("aanganpg.com", "/admin"), { kind: "pass" }, "the room admin stays put");
  assert.deepEqual(
    route("aanganpg.com", "/mess-admin"),
    { kind: "redirect", to: "https://mess.aanganpg.com/mess-admin" },
    "the mess console is not reachable from the room host",
  );
  assert.deepEqual(
    route("mess.aanganpg.com", "/mess/abc/checkin"),
    { kind: "pass" },
    "owner screens are served on the mess host",
  );
  assert.deepEqual(
    route("mess.aanganpg.com", "/search"),
    { kind: "redirect", to: "https://aanganpg.com/search" },
    "a room search asked of the mess host goes home",
  );
  assert.deepEqual(
    route("aanganpg.com", "/mess/abc"),
    { kind: "redirect", to: "https://mess.aanganpg.com/mess/abc" },
    "old mess bookmarks on the room site still arrive",
  );
  assert.deepEqual(route("aanganpg.com", "/search"), { kind: "pass" }, "the room site is untouched");

  // `/messages` must not be mistaken for `/mess`. There is no such page today,
  // and this is the assertion that keeps it that way if one is ever added.
  assert.deepEqual(route("aanganpg.com", "/messages"), { kind: "pass" }, "prefix, not substring");

  // Sign-in is per host: bouncing `/api/auth/*` across hosts would set the
  // session cookie on the wrong domain and silently break login.
  for (const host of ["aanganpg.com", "mess.aanganpg.com"]) {
    assert.deepEqual(route(host, "/api/auth/session"), { kind: "pass" }, `auth stays put on ${host}`);
    assert.deepEqual(route(host, "/robots.txt"), { kind: "pass" }, `robots answers on ${host}`);
  }

  // An unrecognised host — a preview deployment, a laptop, a bare IP — serves
  // everything itself. It has no mess host of its own, so bouncing a mess path
  // to production would throw a developer at live data, and `localhost/mess/x`
  // has to keep working: Google will not sign anyone in to `mess.localhost`.
  assert.deepEqual(route("aangan-rooms.vercel.app", "/search"), { kind: "pass" }, "previews serve rooms");
  assert.deepEqual(route("aangan-rooms.vercel.app", "/mess/abc"), { kind: "pass" }, "previews keep the mess");
  assert.deepEqual(route("localhost:3000", "/mess/abc"), { kind: "pass" }, "dev keeps the mess");

  // Amber on the "sign-in did not finish" notice, which is the one screen that
  // tells somebody they are looking at another person's account.
  assert(
    contrastRatio("#973c00", "#fffbeb") >= 4.5,
    "failed sign-in notice (amber-800 on amber-50) must be >= 4.5",
  );

  // ---- who a month's money involves ---------------------------------------
  // The fees screen used to ask only for students with `leftAt: null`. A
  // student who left was then removed from every month they had ever been
  // billed for: "Money you got" fell by their fee on the day they left, and an
  // unpaid leaver disappeared off the chase list. These are the boundaries.
  const billingMonth = new Date(Date.UTC(2026, 8, 1));
  const onRoll = (joined: string, left: string | null) =>
    onRollDuring({ month: billingMonth, joinedAt: new Date(joined), leftAt: left ? new Date(left) : null });

  assert(onRoll("2026-01-10", null), "a student still on the roll is billed");
  assert(onRoll("2026-09-20", null), "joining mid-month still belongs to that month");
  assert(onRoll("2026-01-10", "2026-09-14"), "leaving mid-month does not erase the month");
  assert(onRoll("2026-01-10", "2026-09-01"), "leaving on the first day still counts for it");
  assert(!onRoll("2026-01-10", "2026-08-31"), "someone gone before the month began is not billed");
  assert(!onRoll("2026-10-02", null), "someone who joins next month is not billed for this one");
  // The exact edge in both directions, one millisecond apart.
  assert(!onRoll("2026-01-10", "2026-08-31T23:59:59.999Z"), "the instant before the month starts is out");
  assert(!onRoll("2026-10-01T00:00:00.000Z", null), "joining the instant the next month starts is out");
  assert(onRoll("2026-09-30T23:59:59.999Z", null), "joining in the last second of the month is in");

  console.log("Self check passed");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
