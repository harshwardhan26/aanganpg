import prisma from "@/lib/prisma";
import { requireMessOwner } from "@/actions/mess";

export const metadata = { title: "Activity history" };

export default async function ActivityPage({ params }: { params: Promise<{ messId: string }> }) {
  const { messId } = await params;
  await requireMessOwner(messId);
  const events = await prisma.activityEvent.findMany({
    where: { messId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, kind: true, summary: true, createdAt: true, actorUserId: true },
  });
  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-text-main">Activity history</h1>
      <p className="mt-1 text-base text-text-muted">
        An append-only record of important money and operating changes.
      </p>
      {events.length === 0 ? (
        <p className="mt-6 rounded-2xl border-2 border-border bg-white p-8 text-center text-text-muted">
          No recorded activity yet.
        </p>
      ) : (
        <ol className="mt-6 flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id} className="rounded-2xl border-2 border-border bg-white p-4">
              <p className="font-semibold text-text-main">{event.summary}</p>
              <p className="mt-1 text-sm text-text-muted">
                {event.createdAt.toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                · {event.kind.toLowerCase().replaceAll("_", " ")}
                {event.actorUserId === "system" ? " · automated" : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
