"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOwnerLead } from "@/actions/admin";
import { Sheet, SheetContent, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Plus, X } from "lucide-react";

const FIELD = "w-full min-h-11 rounded-lg border border-border bg-white px-3 text-text-main";
const LABEL = "mb-1 block text-sm font-medium text-text-main";

/** Today and the next few days, as `YYYY-MM-DD` — the format the date input wants. */
function isoDay(offsetDays: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/**
 * "Come back in two or three days" is the most common thing an owner says on
 * the phone, so it is two taps: the shortcut buttons set the call-back date
 * without opening a date picker at all.
 */
export function AddOwnerLead() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    hostelName: "",
    followupDate: "",
    notes: "",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setForm({ name: "", phone: "", hostelName: "", followupDate: "", notes: "" });
    setError(null);
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createOwnerLead(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  };

  const SHORTCUTS = [
    { label: "Tomorrow", days: 1 },
    { label: "In 2 days", days: 2 },
    { label: "In 3 days", days: 3 },
    { label: "Next week", days: 7 },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center gap-2 rounded-lg bg-primary-strong px-4 text-sm font-semibold text-white hover:bg-primary-hover"
      >
        <Plus className="h-4 w-4" />
        Add owner
      </button>

      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="data-[side=bottom]:h-[90dvh] flex flex-col rounded-t-2xl border-none bg-white px-0 pb-0 pt-0"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <SheetTitle className="font-heading text-lg font-bold text-text-main">
              New owner lead
            </SheetTitle>
            <SheetClose className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-text-muted hover:text-text-main">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </SheetClose>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-900">{error}</p>
            )}

            <div>
              <label className={LABEL} htmlFor="owner-name">Owner name</label>
              <input
                id="owner-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={FIELD}
                placeholder="e.g. Suresh Patil"
                autoComplete="off"
              />
            </div>

            <div>
              <label className={LABEL} htmlFor="owner-phone">Phone</label>
              <input
                id="owner-phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={FIELD}
                placeholder="e.g. 9876543210"
                autoComplete="off"
              />
            </div>

            <div>
              <label className={LABEL} htmlFor="owner-hostel">Hostel name</label>
              <input
                id="owner-hostel"
                value={form.hostelName}
                onChange={(e) => set("hostelName", e.target.value)}
                className={FIELD}
                placeholder="e.g. Sai Hostel, Kadamwadi"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-text-muted">
                Free text — it becomes a real listing once they say yes.
              </p>
            </div>

            <div>
              <label className={LABEL} htmlFor="owner-followup">Call back on</label>
              <div className="mb-2 flex flex-wrap gap-2">
                {SHORTCUTS.map(({ label, days }) => {
                  const value = isoDay(days);
                  const active = form.followupDate === value;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => set("followupDate", active ? "" : value)}
                      className={
                        active
                          ? "min-h-11 rounded-full border border-primary-strong bg-primary-strong px-4 text-sm font-medium text-white"
                          : "min-h-11 rounded-full border border-border bg-white px-4 text-sm font-medium text-text-muted hover:border-text-muted"
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <input
                id="owner-followup"
                type="date"
                value={form.followupDate}
                onChange={(e) => set("followupDate", e.target.value)}
                className={FIELD}
              />
            </div>

            <div>
              <label className={LABEL} htmlFor="owner-notes">Notes</label>
              <textarea
                id="owner-notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className="min-h-24 w-full resize-y rounded-lg border border-border bg-white p-3 text-text-main"
                placeholder="What they said. How many rooms. Who else they've listed with."
              />
            </div>
          </div>

          <div className="shrink-0 border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={submit}
              disabled={isPending || !form.name.trim() || !form.phone.trim()}
              className="min-h-12 w-full rounded-lg bg-primary-strong font-bold text-white hover:bg-primary-hover disabled:bg-slate-300 disabled:text-slate-600"
            >
              {isPending ? "Saving..." : "Save owner lead"}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
