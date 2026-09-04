import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { findStudent } from "@/actions/mess";
import { FeedbackForm } from "./FeedbackForm";

export const metadata = { title: "Mess feedback" };

export default async function StudentFeedbackPage({
  params,
}: {
  params: Promise<{ messId: string }>;
}) {
  const { messId } = await params;
  const student = await findStudent(messId);
  if (!student) redirect("/my-mess");
  const feedback = await prisma.messFeedback.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-6">
      <Link
        href={`/my-mess/${messId}`}
        className="inline-flex min-h-11 items-center font-semibold text-primary-strong"
      >
        ← My mess
      </Link>
      <h1 className="mt-2 font-heading text-3xl font-bold text-text-main">Private feedback</h1>
      <p className="mt-2 text-base text-text-muted">
        Only mess owners can read and respond. Other students cannot see it.
      </p>
      <div className="mt-5">
        <FeedbackForm messId={messId} />
      </div>
      {feedback.length > 0 && (
        <section className="mt-6">
          <h2 className="font-heading text-xl font-bold text-text-main">Your messages</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {feedback.map((item) => (
              <li key={item.id} className="rounded-2xl border-2 border-border bg-white p-4">
                <p className="font-semibold text-text-main">
                  {item.category.toLowerCase()} {item.rating ? `· ${item.rating}/5` : ""}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-text-muted">{item.message}</p>
                {item.ownerResponse && (
                  <div className="mt-3 rounded-xl bg-muted p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                      Owner replied
                    </p>
                    <p className="mt-1 text-sm text-text-main">{item.ownerResponse}</p>
                  </div>
                )}
                <p className="mt-2 text-xs text-text-muted">
                  {item.status.toLowerCase()} · {item.createdAt.toLocaleDateString("en-IN")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
