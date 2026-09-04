import prisma from "@/lib/prisma";
import { requireMessOwner } from "@/actions/mess";
import { ResponseForm } from "./ResponseForm";

export const metadata = { title: "Student feedback" };

export default async function OwnerFeedbackPage({
  params,
}: {
  params: Promise<{ messId: string }>;
}) {
  const { messId } = await params;
  await requireMessOwner(messId);
  const feedback = await prisma.messFeedback.findMany({
    where: { messId },
    include: { student: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-text-main">Student feedback</h1>
      <p className="mt-1 text-base text-text-muted">Private messages and owner responses.</p>
      {feedback.length === 0 ? (
        <p className="mt-6 rounded-2xl border-2 border-border bg-white p-8 text-center text-text-muted">
          No feedback yet.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {feedback.map((item) => (
            <li key={item.id} className="rounded-2xl border-2 border-border bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-text-main">
                    {item.student.name} · {item.category.toLowerCase()}
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    {item.createdAt.toLocaleString("en-IN")}
                    {item.rating ? ` · ${item.rating}/5` : ""}
                  </p>
                </div>
                <span
                  className={
                    item.status === "OPEN"
                      ? "rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900"
                      : "rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-900"
                  }
                >
                  {item.status.toLowerCase()}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-base text-text-main">{item.message}</p>
              <ResponseForm messId={messId} feedbackId={item.id} existing={item.ownerResponse} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
