"use client";

import { useState, useTransition } from "react";
import { getReviewCode, generateReviewCode } from "@/actions/admin-review";
import { Sheet, SheetContent, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Key, Copy, Check, X } from "lucide-react";

/**
 * The review code, in a Sheet rather than a hand-rolled popover.
 *
 * The old version was an `absolute right-0 top-full w-64` panel at `z-10` with
 * no click-outside, no Esc and no focus handling. Anchored to a `flex-1` button
 * inside a card it could run off the right edge of a 320px screen, and there was
 * no way to dismiss it except finding the ✕. `Sheet` — already used by the
 * navbar and the search filters — handles all of that.
 */
export function ReviewCodeButton({ propertyId, title }: { propertyId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    setCopied(false);
    if (next && !loaded) {
      const existing = await getReviewCode(propertyId);
      setCode(existing);
      setLoaded(true);
    }
  };

  const handleGenerate = () => {
    startTransition(async () => {
      setCode(await generateReviewCode(propertyId));
      setCopied(false);
    });
  };

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard is blocked outside a secure context. The code is on screen and
      // selectable, so there is nothing to recover from — just don't claim it
      // was copied.
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-sm font-medium text-indigo-900 hover:bg-indigo-100"
      >
        <Key className="h-4 w-4" />
        Code
      </button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="data-[side=bottom]:h-auto rounded-t-2xl border-none bg-white px-0 pb-[calc(var(--admin-tabbar-h)+1rem)] pt-0"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <SheetTitle className="font-heading text-lg font-bold text-text-main">
              Review code
            </SheetTitle>
            <SheetClose className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-text-muted hover:text-text-main">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </SheetClose>
          </div>

          <div className="space-y-4 px-4 py-4">
            <p className="text-sm text-text-muted">
              Give this code to <strong className="text-text-main">one person</strong> living at{" "}
              <strong className="text-text-main">{title}</strong>. It lets them leave a verified
              review without having enquired through Aangan. It works once — generate a new one
              for the next person.
            </p>

            {!loaded ? (
              <div className="h-14 animate-pulse rounded-lg bg-slate-100" />
            ) : code ? (
              <button
                type="button"
                onClick={handleCopy}
                className="flex min-h-14 w-full items-center justify-center gap-3 rounded-lg bg-slate-100 px-4 font-mono text-lg font-bold tracking-wider text-text-main hover:bg-slate-200"
              >
                {code}
                {copied ? (
                  <Check className="h-5 w-5 shrink-0 text-green-800" />
                ) : (
                  <Copy className="h-5 w-5 shrink-0 text-text-muted" />
                )}
                <span className="sr-only">{copied ? "Copied" : "Copy code"}</span>
              </button>
            ) : (
              <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-text-muted">
                No unused code. Generate one.
              </p>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isPending || !loaded}
              className="min-h-12 w-full rounded-lg border border-border bg-white font-semibold text-text-main hover:bg-slate-50 disabled:opacity-50"
            >
              {isPending ? "Generating..." : code ? "Generate a new code" : "Generate code"}
            </button>
            {code && (
              <p className="text-xs text-text-muted">
                Generating a new code retires the unused one immediately.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
