"use client";

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initPostHog } from '@/lib/posthog';
import posthog from 'posthog-js';
import { useSession } from "next-auth/react";

/**
 * `useSearchParams` opts the whole subtree out of static rendering unless it
 * sits behind a Suspense boundary. This provider wraps every page from the root
 * layout, so leaving it unwrapped made every page in the app dynamic — the
 * build failed to prerender even /about.
 */
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || typeof window === 'undefined') return;
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

    const query = searchParams.toString();
    posthog.capture('$pageview', {
      $current_url: window.origin + pathname + (query ? `?${query}` : ''),
    });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      posthog.identify(session.user.id, {
        email: session.user.email,
        name: session.user.name,
      });
    } else {
      posthog.reset();
    }
  }, [session]);

  return (
    <>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </>
  );
}
