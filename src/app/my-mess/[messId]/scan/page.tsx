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
        <div className="rounded-2xl border-2 border-border bg-white p-8 text-center">
          <p className="font-heading text-2xl font-bold text-text-main">
            {result.reason === "no-key" && "Scan the QR paper at the mess"}
            {result.reason === "no-meal" && "No food right now"}
            {result.reason === "not-a-student" && "You are not in this mess"}
            {result.reason === "left" && "You are not in this mess now"}
          </p>
          <p className="mt-3 text-base text-text-muted">
            {result.reason === "no-key" &&
              "Open your phone camera and point it at the QR paper near the counter. You can mark your food only there."}
            {result.reason === "no-meal" && "Come at food time and scan again."}
            {(result.reason === "not-a-student" || result.reason === "left") &&
              "Ask the mess to add you. Then scan again."}
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
          <p className="font-heading text-2xl font-bold text-white">
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
            <div className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-dashed border-border text-center text-base text-text-muted">
              No photo
            </div>
          )}

          <p className="font-heading text-3xl font-bold text-text-main">{result.name}</p>

          {/*
            * A ticking clock, not the time this page rendered. A screenshot of a
            * receipt keeps the right face and the right name — only a clock that
            * has stopped gives it away, and that check costs the person handing
            * out food no thought at all.
            */}
          <LiveClock />

          {result.alreadyMarked && (
            <p className="rounded-xl bg-muted px-4 py-2 text-base text-text-muted">
              Already marked
            </p>
          )}
        </div>
      </div>

      <p className="mt-5 text-center text-lg font-medium text-text-main">Show this at the mess.</p>
    </Shell>
  );
}

function Shell({ messName, children }: { messName?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      {messName && (
        <p className="mb-4 text-center font-heading text-base font-semibold text-text-muted">
          {messName}
        </p>
      )}
      {children}
    </main>
  );
}
