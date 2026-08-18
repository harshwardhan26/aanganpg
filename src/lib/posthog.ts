"use client";

import posthog from 'posthog-js';

export function initPostHog() {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      capture_pageview: true, // We still want page views, but as noted, they aren't the success metric
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
