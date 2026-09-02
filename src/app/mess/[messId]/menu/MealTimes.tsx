"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { saveMealTimes } from "@/actions/mess";
import { toClockValue, type MealTimes as Times } from "@/lib/mess";

/**
 * The hours this mess serves at.
 *
 * These are not decoration: they decide which meal a scan is filed under, when
 * a student is told food is ready, and what the printed poster says. A mess
 * serving dinner at 7 was marking its own students absent at 6:55.
 */
export function MealTimes({ messId, times }: { messId: string; times: Times }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [issues, setIssues] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  function onSubmit(formData: FormData) {
    setIssues([]);
    setSaved(false);
    startTransition(async () => {
      const result = await saveMealTimes(formData);
      if (result.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setIssues(result.issues);
      }
    });
  }

  return (
    <form
      action={onSubmit}
      className="flex flex-col gap-4 rounded-2xl border-2 border-border bg-white p-5"
    >
      <input type="hidden" name="messId" value={messId} />

      <div>
        <h2 className="flex items-center gap-2 font-heading text-xl font-bold text-text-main">
          <Clock className="h-5 w-5" aria-hidden />
          Food times
        </h2>
        <p className="mt-1 text-base text-text-muted">
          Students can mark their food only between these times.
        </p>
      </div>

      <Row
        label="Breakfast"
        fromName="breakfastFrom"
        toName="breakfastTo"
        from={times.breakfastFrom}
        to={times.breakfastTo}
      />
      <Row
        label="Lunch"
        fromName="lunchFrom"
        toName="lunchTo"
        from={times.lunchFrom}
        to={times.lunchTo}
      />
      <Row
        label="Dinner"
        fromName="dinnerFrom"
        toName="dinnerTo"
        from={times.dinnerFrom}
        to={times.dinnerTo}
      />

      {issues.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 rounded-xl border border-red-200 bg-red-50 p-4">
          {issues.map((issue) => (
            <li key={issue} className="text-base text-red-900">
              {issue}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-14 cursor-pointer items-center justify-center rounded-xl bg-primary-strong px-6 text-lg font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save times"}
        </button>
        {saved && <span className="text-base font-semibold text-green-800">Saved</span>}
      </div>
    </form>
  );
}

function Row({
  label,
  fromName,
  toName,
  from,
  to,
}: {
  label: string;
  fromName: string;
  toName: string;
  from: number;
  to: number;
}) {
  return (
    <fieldset className="flex flex-wrap items-center gap-3">
      <legend className="mb-1 text-base font-semibold text-text-main">{label}</legend>
      <label className="flex items-center gap-2">
        <span className="text-base text-text-muted">From</span>
        <input
          type="time"
          name={fromName}
          defaultValue={toClockValue(from)}
          required
          className="min-h-14 rounded-xl border-2 border-border px-3 text-base text-text-main outline-none focus-visible:border-primary-strong"
        />
      </label>
      <label className="flex items-center gap-2">
        <span className="text-base text-text-muted">To</span>
        <input
          type="time"
          name={toName}
          defaultValue={toClockValue(to)}
          required
          className="min-h-14 rounded-xl border-2 border-border px-3 text-base text-text-main outline-none focus-visible:border-primary-strong"
        />
      </label>
    </fieldset>
  );
}
