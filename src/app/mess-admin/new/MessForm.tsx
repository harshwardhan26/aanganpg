"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMess } from "@/actions/mess-admin";

/**
 * Onboarding a mess, in two fields.
 *
 * This replaces `scripts/create-mess.ts` for everyday use. The script stays as
 * the way in when nobody can reach this screen.
 */
export function MessForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function onSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await createMess(formData);
      if (result.ok) {
        router.push("/mess-admin");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-base font-semibold text-text-main">Mess name</span>
        <input
          name="name"
          required
          maxLength={120}
          placeholder="Shree Mess"
          className="min-h-14 rounded-xl border border-border bg-white px-4 text-base text-text-main outline-none focus-visible:border-primary-strong"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-base font-semibold text-text-main">Owner&apos;s Gmail</span>
        <input
          name="email"
          type="email"
          required
          maxLength={160}
          placeholder="owner@gmail.com"
          className="min-h-14 rounded-xl border border-border bg-white px-4 text-base text-text-main outline-none focus-visible:border-primary-strong"
        />
        <span className="text-sm text-text-muted">
          They must have signed in on the mess site at least once. That sign-in is what creates
          their account.
        </span>
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-base text-red-900"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-14 cursor-pointer items-center justify-center rounded-xl bg-primary-strong px-6 text-lg font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add mess"}
      </button>
    </form>
  );
}
