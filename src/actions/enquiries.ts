"use server";

import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { prisma } from '@/lib/prisma';
import { canonicalPhone } from '@/lib/phone';
import { z } from 'zod';

const enquiryInputSchema = z.object({
  propertyId: z.string().min(1),
  channel: z.enum(['call', 'whatsapp', 'share', 'form', 'referral']),
  name: z.string().optional(),
  phone: z.string().optional(),
});

// Guarded rather than eager: without Upstash configured, dev and the build must
// still run. Rate limiting is skipped, not faked.
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? Redis.fromEnv()
  : null;

const ratelimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
}) : null;

async function processEnquiry(raw: unknown, ip: string) {
  const parsed = enquiryInputSchema.safeParse(raw);
  if (!parsed.success) return { error: 'Invalid input' };
  const data = parsed.data;
  if (ratelimit) {
    const { success } = await ratelimit.limit(`enquiry_${ip}`);
    if (!success) {
      return { error: 'Too many requests. Please try again later.' };
    }
  }

  const session = await getServerSession(authOptions);
  
  // Use session data if available (session value always wins)
  const name = session?.user?.name || data.name || "Student";
  const rawPhone = session?.user?.phone || data.phone;

  // If there's no phone, this is an unauthenticated caller.
  // We fire a PostHog event and write nothing else.
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
    await prisma.lead.create({
      data: {
        name,
        phone,
        propertyId: data.propertyId,
        source: data.channel
      }
    });

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
  const forwardedFor = headersList.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
  return processEnquiry(raw, ip);
}
