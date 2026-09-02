import prisma from "@/lib/prisma";
import { requireMess } from "@/actions/mess";
import { displayPhone } from "@/lib/phone";
import { StudentForm } from "./StudentForm";
import { LeaveButton } from "./LeaveButton";

export const metadata = { title: "Students" };

export default async function StudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ messId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { messId } = await params;
  const { role } = await requireMess(messId, "STAFF");
  const canRemove = role !== "STAFF";

  const showLeft = (await searchParams).show === "left";

  const students = await prisma.student.findMany({
    where: { messId, leftAt: showLeft ? { not: null } : null },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <StudentForm messId={messId} />

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-heading text-base font-semibold text-text-main">
            {showLeft ? "Left the mess" : "On the rolls"}{" "}
            <span className="tabular-nums text-text-muted">({students.length})</span>
          </h2>
          <a
            href={`/mess/${messId}/students${showLeft ? "" : "?show=left"}`}
            className="text-sm text-primary-strong underline underline-offset-2"
          >
            {showLeft ? "Show current" : "Show who left"}
          </a>
        </div>

        {students.length === 0 ? (
          <p className="rounded-xl border border-border bg-white p-6 text-center text-sm text-text-muted">
            {showLeft ? "Nobody has left yet." : "No students yet. Add the first one above."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {students.map((student) => (
              <li
                key={student.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-text-main">{student.name}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {[
                      student.monthlyFee !== null && `₹${student.monthlyFee}/month`,
                      student.parentPhone && displayPhone(student.parentPhone),
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No other details"}
                  </p>
                </div>
                {canRemove && (
                  <LeaveButton
                    messId={messId}
                    studentId={student.id}
                    name={student.name}
                    left={student.leftAt !== null}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
