"use client";

import { useRef } from "react";
import { Search } from "lucide-react";

/**
 * Hostel search with suggestions.
 *
 * A native `<datalist>` rather than a hand-rolled dropdown: the browser filters
 * as you type, and gets the keyboard, the screen-reader semantics and the
 * scroll-into-view behaviour right without any of it being written here. Every
 * custom combobox starts as forty lines and ends as four hundred once arrow
 * keys, Escape, focus return and `aria-activedescendant` are all handled.
 *
 * The list is every hostel that actually has a lead — a couple of dozen strings,
 * sent with the page. No API route, no debounce, no request per keystroke.
 */
export function HostelSearch({
  hostels,
  defaultValue,
  view,
}: {
  hostels: string[];
  defaultValue: string;
  view: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  /**
   * Picking a suggestion searches straight away.
   *
   * Choosing from a datalist fires `input` with the full value in one go, so an
   * exact match against the list means "they picked it" rather than "they typed
   * all of it by hand" — close enough that the one case it gets wrong (typing a
   * hostel's whole name, character by character, with no typos) does exactly
   * what the person wanted anyway.
   */
  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    if (hostels.includes(e.currentTarget.value)) {
      formRef.current?.requestSubmit();
    }
  };

  return (
    <form ref={formRef} action="/admin/leads" method="get" className="flex gap-2">
      <input type="hidden" name="by" value="hostel" />
      {view !== "all" && <input type="hidden" name="view" value={view} />}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          name="q"
          list="hostel-names"
          defaultValue={defaultValue}
          onInput={handleInput}
          placeholder="Search hostel name…"
          aria-label="Search leads by hostel name"
          autoComplete="off"
          className="min-h-11 w-full rounded-lg border border-border bg-white pl-10 pr-3 text-text-main"
        />
        <datalist id="hostel-names">
          {hostels.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
      <button
        type="submit"
        className="min-h-11 rounded-lg border border-border bg-white px-4 text-sm font-medium text-text-main hover:bg-slate-50"
      >
        Search
      </button>
    </form>
  );
}
