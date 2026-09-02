import Image from "next/image";
import prisma from "@/lib/prisma";
import { recordScan } from "@/actions/mess";
import { MEAL_LABEL } from "@/lib/mess";
import { LiveClock } from "./LiveClock";

export const metadata = { title: "Mess entry" };

/**
 * What the poster leads to.
 *
 * The whole page is one server render: opening it *is* the scan. There is no
 * button to press, because a queue of students at a door will not press it, and
 * a scan that needs a second step is a scan that half of them abandon.
 */
export default async function ScanPage({
  params,
  searchParams,
}: {
  params: Promise<{ messId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { messId } = await params;
  const key = (await searchParams).k;

  const mess = await prisma.mess.findUnique({
    where: { id: messId },
    select: { name: true },
  });

  const result = await recordScan(messId, typeof key === "string" ? key : undefined);

  if (!result.ok) {
    return (
      <Shell messName={mess?.name}>
        <div className="rounded-2xl border border-border bg-white p-8 text-center">
          <p className="font-heading text-xl font-bold text-text-main">
            {result.reason === "no-key" && "Scan the poster at the mess"}
            {result.reason === "no-meal" && "No meal is being served right now"}
            {result.reason === "not-a-student" && "You are not on this mess's list"}
            {result.reason === "left" && "You are no longer on this mess's list"}
          </p>
          <p className="mt-2 text-sm text-text-muted">
            {result.reason === "no-key" &&
              "Point your phone camera at the poster by the counter. A meal can only be marked there."}
            {result.reason === "no-meal" && "Scan again at the next meal time."}
            {(result.reason === "not-a-student" || result.reason === "left") &&
              "Ask the mess staff to add you, then scan again."}
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell messName={mess?.name}>
      {/*
        * The receipt. The photo is the point: it was taken by this mess at
        * enrollment, so a receipt forwarded to a friend shows the wrong face and
        * fails at a glance, with nothing for anyone to check or scan.
        */}
      <div className="overflow-hidden rounded-2xl border-2 border-primary-strong bg-white">
        <div className="bg-primary-strong px-5 py-3 text-center">
          <p className="font-heading text-lg font-bold text-white">
            {MEAL_LABEL[result.meal]}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 p-6">
          {result.photoUrl ? (
            <div className="relative h-36 w-36 overflow-hidden rounded-full border-4 border-primary-strong">
              <Image
                src={result.photoUrl}
                alt=""
                fill
                sizes="144px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-dashed border-border text-center text-xs text-text-muted">
              No photo on file
            </div>
          )}

          <p className="font-heading text-2xl font-bold text-text-main">{result.name}</p>

          {/*
            * A ticking clock, not the time this page rendered. A screenshot of a
            * receipt keeps the right face and the right name — only a clock that
            * has stopped gives it away, and that check costs the person handing
            * out food no thought at all.
            */}
          <LiveClock />

          {result.alreadyMarked && (
            <p className="rounded-lg bg-muted px-3 py-1.5 text-xs text-text-muted">
              Already marked for this meal
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-text-muted">Show this to the mess counter.</p>
    </Shell>
  );
}

function Shell({ messName, children }: { messName?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      {messName && (
        <p className="mb-4 text-center font-heading text-sm font-semibold tracking-wide text-text-muted uppercase">
          {messName}
        </p>
      )}
      {children}
    </main>
  );
}
