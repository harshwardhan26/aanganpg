"use server";

import { headers } from 'next/headers';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { prisma } from '@/lib/prisma';
import { canonicalPhone } from '@/lib/phone';

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

async function processEnquiry(data: {
  propertyId: string;
  channel: 'call' | 'whatsapp' | 'share' | 'form' | 'referral';
  name?: string;
  phone?: string;
}, ip: string) {
  if (ratelimit) {
    const { success } = await ratelimit.limit(`enquiry_${ip}`);
    if (!success) {
      return { error: 'Too many requests. Please try again later.' };
    }
  }

  // If there's no name and no phone, this is just a click counter.
  // We fire a PostHog event and write nothing else.
  if (!data.name || !data.phone) {
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

  // This is a form submission (or a referral with contact details).
  const phone = canonicalPhone(data.phone);
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
        name: data.name,
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
          content: `🚨 **New Lead from ${data.name}**\nPhone: ${phone}\nProperty ID: \`${data.propertyId}\`\nSource: ${data.channel}`
        })
      }).catch((e) => console.error("Webhook failed:", e));
    }
  }

  return { success: true };
}

export async function recordEnquiry(data: {
  propertyId: string;
  channel: 'call' | 'whatsapp' | 'share' | 'form' | 'referral';
  name?: string;
  phone?: string;
}) {
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
  return processEnquiry(data, ip);
}
