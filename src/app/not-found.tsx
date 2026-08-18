import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-max text-center">
        <p className="text-base font-semibold text-primary-strong">404</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl font-heading">
          Page not found
        </h1>
        <p className="mt-6 text-base leading-7 text-slate-600">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link href="/">
            <Button className="bg-primary-strong text-white hover:bg-primary-hover">
              Go back home
            </Button>
          </Link>
          <Link href="/search" className="text-sm font-semibold leading-6 text-slate-900 hover:text-primary-strong">
            Browse all rooms <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
