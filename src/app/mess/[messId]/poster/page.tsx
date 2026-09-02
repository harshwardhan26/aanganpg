import QRCode from "qrcode";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireMess } from "@/actions/mess";
import { getBaseUrl } from "@/lib/url";
import { scanKey } from "@/lib/scan-key";
import { MEAL_WINDOWS } from "@/lib/mess";

export const metadata = { title: "Entry poster" };

/** `18:30` from minutes past midnight. */
function clockLabel(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour >= 12 ? "PM" : "AM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${String(minute).padStart(2, "0")} ${suffix}`;
}

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
    select: { name: true },
  });
  if (!mess) redirect("/mess");

  // The key is what makes this printed sheet the only way to mark a meal — see
  // `lib/scan-key.ts`. It is why the poster matters rather than being a
  // convenience shortcut to a page anyone could open.
  const url = `${getBaseUrl()}/my-mess/${messId}/scan?k=${scanKey(messId)}`;

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
        <h2 className="font-heading text-base font-semibold text-text-main">Print this</h2>
        <p className="mt-1 text-sm text-text-muted">
          Stick it where students queue. They scan with any phone camera, sign in
          once with Google, and their photo appears on screen for you to check.
        </p>
        <p className="mt-2 text-xs break-all text-text-muted">{url}</p>
      </div>

      <div className="mx-auto w-full max-w-md rounded-2xl border-2 border-primary-strong bg-white p-8 text-center print:border-black">
        <p className="font-heading text-2xl font-bold text-text-main">{mess.name}</p>
        <p className="mt-1 text-sm text-text-muted">Scan to mark your meal</p>

        <div
          className="mx-auto mt-6 w-full max-w-64 [&>svg]:h-auto [&>svg]:w-full"
          aria-label="QR code for the mess entry page"
          dangerouslySetInnerHTML={{ __html: svg }}
        />

        <ul className="mt-6 flex flex-col gap-1 text-sm text-text-main">
          {MEAL_WINDOWS.map((window) => (
            <li key={window.meal} className="flex justify-between border-b border-border py-1">
              <span className="font-medium">{window.label}</span>
              <span className="tabular-nums text-text-muted">
                {clockLabel(window.from)} – {clockLabel(window.to)}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-xs text-text-muted">Show the receipt at the counter.</p>
      </div>
    </div>
  );
}
