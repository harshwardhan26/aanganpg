"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Inter } from "next/font/google";
import Link from "next/link";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function GlobalError({
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
    <html lang="en">
      <body className={inter.className}>
        <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-max text-center">
            <p className="text-base font-semibold text-[#cc4040]">500</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl font-heading">
              Fatal Error
            </h1>
            <p className="mt-6 text-base leading-7 text-slate-600">
              A critical error occurred. We have been notified and are looking into it.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <button
                onClick={() => reset()}
                className="bg-[#cc4040] text-white px-4 py-2 rounded-md font-semibold hover:bg-[#b03030]"
              >
                Try again
              </button>
              <Link href="/" className="text-sm font-semibold leading-6 text-slate-900 hover:text-[#cc4040]">
                Go back home <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
