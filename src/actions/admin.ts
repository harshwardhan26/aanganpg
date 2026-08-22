"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath, updateTag } from "next/cache";
import { slugify, resolveSlug } from "@/lib/slug";
import { canonicalPhone } from "@/lib/phone";
import { ROOMS_TAG } from "@/lib/room-cache";
import {
  pgPublishIssues,
  GENDER_PREFERENCES,
  OCCUPANCY_TYPES,
  FOOD_TYPES,
  KOLHAPUR_LOCALITIES,
} from "@/lib/property-options";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.phone) {
    throw new Error("Unauthorized");
  }
  
  if (session.user.phone !== process.env.ADMIN_PHONE && session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

/**
 * "" from an untouched form field means absent, and must become null rather
 * than an empty string. `Number("") === 0`, so parsing has to reject the empty
 * string before it converts — the alternative is the `Number(x) || fallback`
 * idiom, which treats a real 0 as absent and is how a previous product invented
 * an area of 1000 sqft for every listing that left the field blank.
 */
const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const optionalInt = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  });

const optionalFloat = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  });

const imageSchema = z.object({
  url: z.string().url(),
  // "bathroom" and "thali" are the two the publish guard reads.
  tag: z.string().nullable().optional(),
});

const listingSchema = z.object({
  id: optionalText,
  title: z.string().trim().min(3, "Give the listing a title."),
  price: optionalInt,
  yearlyPrice: optionalInt,
  location: z.enum(KOLHAPUR_LOCALITIES).nullable().optional(),
  landmark: optionalText,
  lat: optionalFloat,
  lng: optionalFloat,
  collegeId: optionalText,
  walkMinutes: optionalInt,
  genderPreference: z.enum(GENDER_PREFERENCES).nullable().optional(),
  occupancyType: z.enum(OCCUPANCY_TYPES).nullable().optional(),
  deposit: optionalInt,
  vacantBeds: optionalInt,
  amenities: z.array(z.string()).default([]),
  rules: z.array(z.string()).default([]),
  // The form's "None" option means no mess at all. Stored as null, because null
  // IS the filter — `foodType: { not: null }` is what "with mess" searches on,
  // and storing the string "None" made every listing match it.
  foodType: z
    .union([z.enum(FOOD_TYPES), z.literal("None"), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v === "None" || v === "" || v === undefined ? null : v)),
  messNote: optionalText,
  wardenName: optionalText,
  gateClosingTime: optionalText,
  ownerName: optionalText,
  ownerPhone: optionalText,
  description: optionalText,
  images: z.array(imageSchema).default([]),
}).superRefine((data, ctx) => {
  if (data.price == null && data.yearlyPrice == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one of monthly rent or yearly rent must be filled.",
      path: ["price"],
    });
  }
});

export type ListingInput = z.input<typeof listingSchema>;

/**
 * A slug that is unique in the database.
 *
 * The admin action used to build this inline with a regex and no collision
 * handling, so a second listing called "Girls PG" hit the unique constraint and
 * threw a Prisma error at the person filling in the form.
 */
async function uniqueSlug(title: string, locality: string | null, ownId: string | null) {
  for (let i = 0; i < 50; i++) {
    const candidate = slugify(title, locality, i);
    const clash = await prisma.property.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!clash || clash.id === ownId) return candidate;
  }
  // 50 listings sharing a title and locality is not a real case; a timestamp
  // suffix is still better than throwing on the last field of a long form.
  return slugify(title, locality, Date.now());
}

export async function markFull(id: string) {
  await requireAdmin();
  const property = await prisma.property.update({ 
    where: { id }, 
    data: { vacantBeds: 0 },
    select: { slug: true, college: { select: { slug: true } } }
  });
  
  updateTag(ROOMS_TAG);
  revalidatePath("/admin/listings");
  revalidatePath("/search");
  revalidatePath("/");
  revalidatePath(`/pg/${property.slug}`);
  if (property.college) revalidatePath(`/kolhapur/${property.college.slug}`);
  revalidatePath("/sitemap.xml");
}

export async function markClosed(id: string) {
  await requireAdmin();
  const property = await prisma.property.update({ 
    where: { id }, 
    data: { closedAt: new Date() },
    select: { slug: true, college: { select: { slug: true } } }
  });
  
  updateTag(ROOMS_TAG);
  revalidatePath("/admin/listings");
  revalidatePath("/search");
  revalidatePath("/");
  revalidatePath(`/pg/${property.slug}`);
  if (property.college) revalidatePath(`/kolhapur/${property.college.slug}`);
  revalidatePath("/sitemap.xml");
}

export async function softDelete(id: string) {
  await requireAdmin();
  const property = await prisma.property.update({ 
    where: { id }, 
    data: { deletedAt: new Date() },
    select: { slug: true, college: { select: { slug: true } } }
  });
  
  updateTag(ROOMS_TAG);
  revalidatePath("/admin/listings");
  revalidatePath("/search");
  revalidatePath("/");
  revalidatePath(`/pg/${property.slug}`);
  if (property.college) revalidatePath(`/kolhapur/${property.college.slug}`);
  revalidatePath("/sitemap.xml");
}


export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; issues: string[] };

/**
 * Create or update a listing.
 *
 * The publish guard runs HERE, not only in the form. It used to live solely in
 * the client component, which made the single most important rule in this
 * product — no listing without a bathroom photo — a disabled button that any
 * caller could route around.
 */
export async function saveListing(raw: unknown, publish: boolean): Promise<SaveResult> {
  await requireAdmin();

  const parsed = listingSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, issues: parsed.error.issues.map((i) => i.message) };
  }
  const data = parsed.data;

  if (publish) {
    const issues = pgPublishIssues({
      genderPreference: data.genderPreference,
      images: data.images,
      hasBathroomPhoto: data.images.some((i) => i.tag === "bathroom"),
      hasThaliPhoto: data.images.some((i) => i.tag === "thali"),
      foodType: data.foodType,
      wardenName: data.wardenName,
      gateClosingTime: data.gateClosingTime,
      ownerPhone: data.ownerPhone,
    });
    if (issues.length > 0) return { ok: false, issues };
  }

  const existing = data.id
    ? await prisma.property.findUnique({
        where: { id: data.id },
        select: { verifiedAt: true, slug: true, collegeId: true },
      })
    : null;

  const session = await getServerSession(authOptions);

  // 1. Get the base slug via pure logic (preserves existing, or builds new)
  const baseSlug = resolveSlug(existing?.slug, data.title, data.location ?? null);
  // 2. If it was an existing slug, it's already safe. If new, run uniqueness check.
  const slug = existing?.slug ? baseSlug : await uniqueSlug(data.title, data.location ?? null, data.id ?? null);

  const fields = {
    title: data.title,
    slug,
    price: data.price ?? null,
    yearlyPrice: data.yearlyPrice ?? null,
    displayPrice: data.price != null 
      ? `₹${data.price.toLocaleString("en-IN")}/month` 
      : data.yearlyPrice != null 
        ? `₹${data.yearlyPrice.toLocaleString("en-IN")}/year` 
        : null,
    location: data.location ?? null,
    landmark: data.landmark ?? null,
    lat: data.lat,
    lng: data.lng,
    collegeId: data.collegeId ?? null,
    walkMinutes: data.walkMinutes,
    genderPreference: data.genderPreference ?? null,
    occupancyType: data.occupancyType ?? null,
    deposit: data.deposit,
    vacantBeds: data.vacantBeds,
    amenities: data.amenities,
    rules: data.rules,
    foodType: data.foodType,
    messNote: data.messNote ?? null,
    wardenName: data.wardenName ?? null,
    gateClosingTime: data.gateClosingTime ?? null,
    ownerName: data.ownerName ?? null,
    // One canonical spelling per number, so tel: and wa.me links and the lead
    // dedupe all agree.
    ownerPhone: canonicalPhone(data.ownerPhone),
    description: data.description ?? null,
    imageUrl: data.images[0]?.url ?? null,
  };

  // Publishing is a visit record, not a boolean: a named person on a stated
  // date, which is what the listing page shows. Re-publishing an already
  // verified listing must not rewrite the original visit date.
  const verification = publish
    ? {
        verifiedAt: existing?.verifiedAt ?? new Date(),
        verifiedBy: session?.user?.name ?? "Aangan",
      }
    : { verifiedAt: null, verifiedBy: null };

  const images = {
    create: data.images.map((img) => ({ url: img.url, tag: img.tag ?? null })),
  };

  const property = data.id
    ? await prisma.property.update({
        where: { id: data.id },
        data: { ...fields, ...verification, images: { deleteMany: {}, ...images } },
      })
    : await prisma.property.create({ data: { ...fields, ...verification, images } });

  // updateTag, not revalidateTag: an admin who just saved an edit must see it
  // on the next request, not the request after.
  updateTag(ROOMS_TAG);
  revalidatePath("/admin/listings");
  revalidatePath("/search");
  revalidatePath("/");
  revalidatePath(`/pg/${slug}`);
  revalidatePath("/sitemap.xml");

  if (fields.collegeId) {
    const college = await prisma.college.findUnique({ where: { id: fields.collegeId } });
    if (college) revalidatePath(`/kolhapur/${college.slug}`);
  }

  if (existing?.collegeId && existing.collegeId !== fields.collegeId) {
    const oldCollege = await prisma.college.findUnique({ where: { id: existing.collegeId } });
    if (oldCollege) revalidatePath(`/kolhapur/${oldCollege.slug}`);
  }
  return { ok: true, id: property.id };
}

export async function updateLeadStatus(id: string, status: string) {
  await requireAdmin();
  await prisma.lead.update({ where: { id }, data: { status } });
  revalidatePath("/admin/leads");
}

const leadUpdateSchema = z.object({
  notes: z.string().nullable().optional(),
  stage: z.string().optional(),
  followupDate: z.date().nullable().optional(),
});

export async function updateLeadDetails(id: string, rawData: unknown) {
  await requireAdmin();
  const parsed = leadUpdateSchema.safeParse(rawData);
  if (!parsed.success) throw new Error("Invalid lead data");

  const data = parsed.data;
  
  // Webhook notification for CONVERTED
  if (data.stage === 'CONVERTED') {
    const existing = await prisma.lead.findUnique({ where: { id }, include: { property: true } });
    if (existing && existing.stage !== 'CONVERTED' && process.env.LEAD_WEBHOOK_URL) {
      fetch(process.env.LEAD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🎉 **LEAD CONVERTED!** 🎉\n${existing.name} (${existing.phone}) has moved in to ${existing.property?.title || 'a PG'}! Great job.`
        })
      }).catch((e) => console.error("Webhook failed:", e));
    }
  }

  await prisma.lead.update({
    where: { id },
    data: {
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.stage !== undefined && { stage: data.stage }),
      ...(data.followupDate !== undefined && { followupDate: data.followupDate }),
    }
  });

  revalidatePath("/admin/leads");
}

export async function promoteUser(phoneInput: string) {
  await requireAdmin();
  const phone = canonicalPhone(phoneInput);
  if (!phone) return { error: "Invalid phone number" };

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return { error: "User not found" };

  await prisma.user.update({
    where: { phone },
    data: { role: "admin" }
  });

  return { success: true };
}
