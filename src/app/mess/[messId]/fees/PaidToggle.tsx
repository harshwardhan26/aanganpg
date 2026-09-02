"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPaid } from "@/actions/mess";
import { cn } from "@/lib/utils";

export function PaidToggle({
  messId,
  studentId,
  month,
  paid,
}: {
  messId: string;
  studentId: string;
  month: string;
  paid: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function onClick() {
    // Undoing a payment is the destructive direction, and money is the one place
    // in this app where a mis-tap costs an argument with a parent.
    if (paid && !confirm("Change this back to not paid?")) return;

    setFailed(false);
    startTransition(async () => {
      try {
        await setPaid(messId, studentId, `${month}-01`, !paid);
        router.refresh();
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={paid}
      className={cn(
        "flex min-h-14 shrink-0 cursor-pointer items-center rounded-xl border-2 px-5 text-base font-semibold transition-colors disabled:opacity-60",
        failed
          ? "border-red-800 text-red-800"
          : paid
            ? "border-primary-strong bg-primary-strong text-white"
            : "border-border text-text-muted hover:bg-muted",
      )}
    >
      {pending ? "…" : failed ? "Try again" : paid ? "Paid" : "Got money"}
    </button>
  );
}
