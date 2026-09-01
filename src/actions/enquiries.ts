"use server";

import { headers } from 'next/headers';
import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { slidingLimiter, allowRequest } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { canonicalPhone } from '@/lib/phone';
import { trustedIp } from '@/lib/request';
import { z } from 'zod';

const enquiryInputSchema = z.object({
  propertyId: z.string().trim().min(1).max(64),
  channel: z.enum(['call', 'whatsapp', 'share', 'form', 'referral']),
  // Capped because these land in `Lead.name`/`Lead.phone`, which are unbounded
  // text columns. `canonicalPhone` rejects anything that is not an Indian
  // mobile anyway, so the phone cap only stops the payload before it is parsed.
  name: z.string().max(120).optional(),
  phone: z.string().max(24).optional(),
});

const ratelimit = slidingLimiter(5, '1 m');

async function processEnquiry(raw: unknown, ip: string) {
  const parsed = enquiryInputSchema.safeParse(raw);
  if (!parsed.success) return { error: 'Invalid input' };
  const data = parsed.data;

  const session = await getServerSession(authOptions);

  // Key on the account when there is one. A user id comes off a signed JWT and
  // cannot be rotated the way a header can, so the limit actually holds for the
  // path that writes to the database. The IP bucket is left for anonymous
  // clicks, which now only reach PostHog.
  const key = session?.user?.id ? `enquiry_user_${session.user.id}` : `enquiry_ip_${ip}`;
  if (!(await allowRequest(ratelimit, key))) {
    return { error: 'Too many requests. Please try again in a minute.' };
  }

  // The lead's identity comes from the session, never from the request body.
  // Trusting `data.phone` let an unauthenticated caller write any name against
  // any number — and the lead inbox is the whole business. The client still
  // sends name/phone from the enquiry form; they are now only a fallback for a
  // signed-in account that has not yet filled in its profile.
  const name = session?.user?.name || (session?.user?.id ? data.name : null) || "Student";
  const rawPhone = session?.user?.phone || (session?.user?.id ? data.phone : null);

  // No session, or a session with no number on file yet: nothing we could follow
  // up. Fire a PostHog event and write nothing else.
  if (!rawPhone) {
    // Analytics, so nothing waits on it — but for the same reason as the lead
    // webhook it is handed to `after` rather than dropped on the floor. It used
    // to be awaited, which put a round trip to PostHog in front of every
    // anonymous contact click.
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (posthogKey) {
      after(async () => {
        try {
          await fetch('https://us.i.posthog.com/capture/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: posthogKey,
              event: 'enquiry_click',
              properties: {
                distinct_id: ip,
                channel: data.channel,
                propertyId: data.propertyId,
              }
            })
          });
        } catch {
          // An analytics event is not worth an error path.
        }
      });
    }
    return { success: true };
  }

  const phone = canonicalPhone(rawPhone);
  if (!phone) {
    return { error: 'Please enter a valid phone number.' };
  }

  // Dedupe on (kind, phone, propertyId): a second identical submit updates
  // updatedAt. `kind` matters because a hostel owner is also a Lead row now —
  // without it, an owner enquiring about their own listing from their own phone
  // would update their outreach card instead of creating a student enquiry, and
  // silently overwrite its source.
  const existing = await prisma.lead.findFirst({
    where: { kind: 'student', phone, propertyId: data.propertyId }
  });

  if (existing) {
    await prisma.lead.update({
      where: { id: existing.id },
      data: { 
        updatedAt: new Date(), 
        source: data.channel 
      }
    });
  } else {
    try {
      await prisma.lead.create({
        data: {
          kind: 'student',
          name,
          phone,
          propertyId: data.propertyId,
          source: data.channel
        }
      });
    } catch (e) {
      // `Lead.propertyId` is a foreign key, so an id that does not resolve —
      // a hand-edited request, or a listing hard-deleted between page load and
      // click — used to surface as an uncaught P2003 and a 500.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        return { error: 'That listing is no longer available.' };
      }
      throw e;
    }

    // `after`, not a bare floating promise. The alert must not delay the
    // student's response, but a promise nobody holds is one the serverless
    // runtime is free to kill the moment the response is sent — so the lead row
    // lands in the database and the ping announcing it silently never arrives.
    // `after` keeps the instance alive until this finishes.
    const webhookUrl = process.env.LEAD_WEBHOOK_URL;
    if (webhookUrl) {
      after(async () => {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `🚨 **New Lead from ${name}**\nPhone: ${phone}\nProperty ID: \`${data.propertyId}\`\nSource: ${data.channel}`
            })
          });
        } catch (e) {
          console.error("Webhook failed:", e);
        }
      });
    }
  }

  // The admin dashboard and lead inbox count these rows. Without this a new
  // enquiry does not show up until the cached page happens to expire, so the
  // "due today" and "overdue" numbers an admin plans their day around can be
  // hours stale.
  revalidatePath('/admin');
  revalidatePath('/admin/leads');

  return { success: true };
}

export async function recordEnquiry(raw: unknown) {
  const headersList = await headers();
  return processEnquiry(raw, trustedIp({
    'x-real-ip': headersList.get('x-real-ip'),
    'x-forwarded-for': headersList.get('x-forwarded-for'),
  }));
}
