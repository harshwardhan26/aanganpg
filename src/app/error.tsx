"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
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
    <main className="flex min-h-[70vh] flex-col items-center justify-center bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-max text-center">
        <p className="text-base font-semibold text-primary-strong">500</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl font-heading">
          Something went wrong.
        </h1>
        <p className="mt-6 text-base leading-7 text-slate-600">
          Sorry, we encountered an unexpected error. Our team has been notified.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button onClick={() => reset()} className="bg-primary-strong text-white hover:bg-primary-hover">
            Try again
          </Button>
          <Link href="/" className="text-sm font-semibold leading-6 text-slate-900 hover:text-primary-strong">
            Go back home <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
