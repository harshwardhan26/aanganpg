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
    if (!left && !confirm(`Mark ${name} as left? Their attendance history is kept.`)) return;

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
      className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-muted disabled:opacity-60"
    >
      {pending ? "…" : left ? "Bring back" : "Mark left"}
    </button>
  );
}
