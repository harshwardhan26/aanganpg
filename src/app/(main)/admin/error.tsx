"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Without this an admin error falls through to the site-wide `app/error.tsx`,
 * which drops you on a student-facing page offering to "Go back home" — out of
 * the admin entirely, and with no way to retry the thing that failed.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="rounded-xl border border-border bg-white p-6 text-center sm:p-10">
      <h2 className="font-heading text-xl font-bold text-text-main">
        This screen failed to load.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-text-muted">
        Nothing was saved or lost — the page could not fetch its data. Try again,
        and if it keeps failing the error has been reported.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-text-muted">Ref: {error.digest}</p>
      )}
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button
          onClick={() => reset()}
          className="w-full bg-primary-strong text-white hover:bg-primary-hover sm:w-auto"
        >
          Try again
        </Button>
        <Button
          variant="outline"
          className="w-full border-border text-text-main sm:w-auto"
          render={<Link href="/admin" />}
          nativeButton={false}
        >
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
