"use server";

import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { slidingLimiter, allowRequest } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { canonicalPhone } from '@/lib/phone';
import { trustedIp } from '@/lib/request';
import { z } from 'zod';

const enquiryInputSchema = z.object({
  propertyId: z.string().min(1),
  channel: z.enum(['call', 'whatsapp', 'share', 'form', 'referral']),
  name: z.string().optional(),
  phone: z.string().optional(),
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
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (posthogKey) {
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
      }).catch(() => {});
    }
    return { success: true };
  }

  const phone = canonicalPhone(rawPhone);
  if (!phone) {
    return { error: 'Please enter a valid phone number.' };
  }

  // Dedupe on (phone, propertyId): a second identical submit updates updatedAt
  const existing = await prisma.lead.findFirst({
    where: { phone, propertyId: data.propertyId }
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

    if (process.env.LEAD_WEBHOOK_URL) {
      fetch(process.env.LEAD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🚨 **New Lead from ${name}**\nPhone: ${phone}\nProperty ID: \`${data.propertyId}\`\nSource: ${data.channel}`
        })
      }).catch((e) => console.error("Webhook failed:", e));
    }
  }

  return { success: true };
}

export async function recordEnquiry(raw: unknown) {
  const headersList = await headers();
  return processEnquiry(raw, trustedIp({
    'x-real-ip': headersList.get('x-real-ip'),
    'x-forwarded-for': headersList.get('x-forwarded-for'),
  }));
}
