"use client";

import { useState, useTransition } from "react";
import { saveMenu } from "@/actions/mess";
import type { MealName } from "@/lib/mess";

/**
 * One meal on one weekday.
 *
 * Saves on blur rather than behind a button: twenty-one boxes with twenty-one
 * Save buttons is twenty-one chances to fill one in and walk away without
 * pressing anything.
 */
export function MenuSlot({
  messId,
  weekday,
  meal,
  label,
  items,
}: {
  messId: string;
  weekday: number;
  meal: MealName;
  label: string;
  items: string;
}) {
  const [value, setValue] = useState(items);
  const [saved, setSaved] = useState<"idle" | "saving" | "done" | "failed">("idle");
  const [, startTransition] = useTransition();

  function commit() {
    if (value.trim() === items.trim()) return;

    setSaved("saving");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("messId", messId);
      formData.set("weekday", String(weekday));
      formData.set("meal", meal);
      formData.set("items", value);

      try {
        await saveMenu(formData);
        setSaved("done");
      } catch {
        setSaved("failed");
      }
    });
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="flex items-baseline justify-between">
        <span className="font-medium text-text-main">{label}</span>
        {saved === "saving" && <span className="text-xs text-text-muted">Saving…</span>}
        {saved === "done" && <span className="text-xs text-green-800">Saved</span>}
        {saved === "failed" && <span className="text-xs text-red-700">Not saved — try again</span>}
      </span>
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved("idle");
        }}
        onBlur={commit}
        placeholder="Rajma, rice, roti, salad"
        className="rounded-lg border border-border bg-white px-3 py-2.5 text-base outline-none focus:border-primary-strong"
      />
    </label>
  );
}
