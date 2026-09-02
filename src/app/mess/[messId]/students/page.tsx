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

  const query = await searchParams;
  const showLeft = query.show === "left";
  const editId = typeof query.edit === "string" ? query.edit : null;

  const students = await prisma.student.findMany({
    where: { messId, leftAt: showLeft ? { not: null } : null },
    orderBy: { name: "asc" },
  });

  // A typo in an email or a fee is the normal case at 200 students, and until
  // this existed the only way to fix one was a database script.
  const editing = editId ? (students.find((s) => s.id === editId) ?? null) : null;

  return (
    <div className="flex flex-col gap-6">
      <StudentForm
        // Remounts on a different student, so the form's own state — the photo,
        // the typed values — never carries over from whoever was open before.
        key={editing?.id ?? "new"}
        messId={messId}
        student={
          editing
            ? {
                id: editing.id,
                name: editing.name,
                email: editing.email,
                photoUrl: editing.photoUrl,
                parentName: editing.parentName,
                parentPhone: editing.parentPhone,
                monthlyFee: editing.monthlyFee,
              }
            : undefined
        }
      />

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
                className="flex items-start justify-between gap-2 rounded-xl border border-border bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text-main">{student.name}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {[
                      student.monthlyFee !== null && `₹${student.monthlyFee}/month`,
                      student.parentPhone && displayPhone(student.parentPhone),
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No other details"}
                  </p>
                  {/* Shown back deliberately. A wrong-but-valid address like
                      `gmai.com` cannot be caught by validation, and this is
                      where someone would notice it. */}
                  <p className="mt-0.5 truncate text-xs text-text-muted">
                    {student.email ?? (
                      <span className="text-amber-700">No email — cannot use the app</span>
                    )}
                  </p>
                </div>
                <a
                  href={`/mess/${messId}/students?edit=${student.id}`}
                  className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-main hover:bg-muted"
                >
                  Edit
                </a>
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
