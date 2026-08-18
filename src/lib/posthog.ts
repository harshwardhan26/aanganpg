"use client";

import posthog from 'posthog-js';

export function initPostHog() {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      // PageviewTracker captures these by hand so client-side route changes are
      // counted once. Leaving this on double-counted every navigation.
      capture_pageview: false,
      capture_pageleave: false,
      autocapture: false, // We ONLY want the explicit events: pg_contact_clicked, room_shared, filter_applied, lead_submitted
    });
  }
}

export function trackEvent(
  eventName: "pg_contact_clicked" | "room_shared" | "filter_applied" | "lead_submitted",
  properties?: Record<string, unknown>
) {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.capture(eventName, properties);
  }
}
