"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStudentLeft } from "@/actions/mess";

export function LeaveButton({
  messId,
  studentId,
  name,
  left,
}: {
  messId: string;
  studentId: string;
  name: string;
  left: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    // Only the removal asks. Putting someone back on the rolls is not a loss,
    // so a confirm there is a click the person has to spend for nothing.
    if (!left && !confirm(`${name} has left the mess?\n\nTheir old meals are kept.`)) return;

    startTransition(async () => {
      await setStudentLeft(messId, studentId, !left);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="flex min-h-12 shrink-0 items-center rounded-xl border-2 border-border px-4 text-base font-semibold text-text-muted transition-colors hover:bg-muted disabled:opacity-60"
    >
      {pending ? "…" : left ? "Add back" : "Left"}
    </button>
  );
}
