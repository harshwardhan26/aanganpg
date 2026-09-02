import QRCode from "qrcode";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireMess } from "@/actions/mess";
import { getMessUrl } from "@/lib/url";
import { scanKey } from "@/lib/scan-key";
import { mealWindows, clockLabel, MESS_TIMES_SELECT } from "@/lib/mess";

export const metadata = { title: "Entry poster" };


/**
 * The sheet the owner prints and sticks by the door.
 *
 * The QR is a plain link to the scan page — it carries no student identity and
 * no secret, because a poster on a wall is a public thing that will be
 * photographed. Everything about who is scanning comes from their own signed-in
 * session on the other side.
 */
export default async function PosterPage({
  params,
}: {
  params: Promise<{ messId: string }>;
}) {
  const { messId } = await params;
  const { role } = await requireMess(messId, "STAFF");
  if (role === "STAFF") redirect(`/mess/${messId}`);

  const mess = await prisma.mess.findUnique({
    where: { id: messId },
    select: { name: true, ...MESS_TIMES_SELECT },
  });
  if (!mess) redirect("/mess");

  // The key is what makes this printed sheet the only way to mark a meal — see
  // `lib/scan-key.ts`. It is why the poster matters rather than being a
  // convenience shortcut to a page anyone could open.
  const url = `${getMessUrl()}/my-mess/${messId}/scan?k=${scanKey(messId)}`;

  // Rendered on the server as an SVG string: it prints crisply at any size, and
  // no QR code is shipped to the browser as a script.
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Screen-only guidance. `print:hidden` keeps it off the sheet itself. */}
      <div className="rounded-xl border border-border bg-white p-4 print:hidden">
        <h2 className="font-heading text-xl font-bold text-text-main">Print this paper</h2>
        <p className="mt-2 text-base text-text-muted">
          Stick it near the food counter. Students point their phone camera at it. Their name and
          photo come on their phone. Look at the photo before you give food.
        </p>
        <p className="mt-3 text-sm break-all text-text-muted">{url}</p>
      </div>

      <div className="mx-auto w-full max-w-md rounded-2xl border-2 border-primary-strong bg-white p-8 text-center print:border-black">
        <p className="font-heading text-2xl font-bold text-text-main">{mess.name}</p>
        <p className="mt-2 text-lg text-text-muted">Point your phone camera here</p>
        {/*
          * The camera app opens the real browser, which keeps a student signed
          * in for a month. A QR opened from inside Instagram or WhatsApp opens
          * that app's own throwaway browser instead, where the sign-in does not
          * last — so they are asked to sign in again every single time.
          */}
        <p className="mt-1 text-base font-semibold text-primary-strong">
          Use the camera app. Not Instagram or WhatsApp.
        </p>

        <div
          className="mx-auto mt-6 w-full max-w-64 [&>svg]:h-auto [&>svg]:w-full"
          aria-label="QR code for the mess entry page"
          dangerouslySetInnerHTML={{ __html: svg }}
        />

        <ul className="mt-6 flex flex-col gap-1 text-sm text-text-main">
          {mealWindows(mess).map((window) => (
            <li key={window.meal} className="flex justify-between border-b border-border py-2 text-base">
              <span className="font-semibold">{window.label}</span>
              <span className="tabular-nums text-text-muted">
                {clockLabel(window.from)} – {clockLabel(window.to)}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-base text-text-muted">
          Sign in once with your Gmail. Then show your phone at the counter.
        </p>
      </div>
    </div>
  );
}
