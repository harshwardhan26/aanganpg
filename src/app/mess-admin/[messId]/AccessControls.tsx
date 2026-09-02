"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "lucide-react";
import { addMember, removeMember } from "@/actions/mess-admin";

export type Member = {
  userId: string;
  name: string | null;
  email: string | null;
  role: "OWNER" | "STAFF";
};

/**
 * Who can open a mess, and as what.
 *
 * The two roles are not decoration: `requireMess` reads them, so a helper added
 * here genuinely cannot open the fees screen. That is the whole reason a mess
 * gives a worker an account at all.
 */
export function AccessControls({ messId, members }: { messId: string; members: Member[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function run(work: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError("");
    startTransition(async () => {
      const result = await work();
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-3">
        {members.map((m) => (
          <li
            key={m.userId}
            className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4"
          >
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold text-text-main">
                {m.name ?? m.email ?? "Unknown"}
              </span>
              <span className="block truncate text-sm text-text-muted">{m.email}</span>
            </span>

            <span className="flex shrink-0 items-center gap-2">
              <span
                className={
                  m.role === "OWNER"
                    ? "rounded-full bg-primary-strong/10 px-3 py-1 text-sm font-semibold text-primary-strong"
                    : "rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-text-muted"
                }
              >
                {m.role === "OWNER" ? "Owner" : "Helper"}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => removeMember(messId, m.userId))}
                aria-label={`Remove ${m.email ?? "this person"}`}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-red-50 hover:text-red-800 disabled:opacity-50"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </span>
          </li>
        ))}
      </ul>

      <form
        action={(formData) => run(() => addMember(formData))}
        className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-5"
      >
        <input type="hidden" name="messId" value={messId} />

        <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-text-main">
          <UserPlus className="h-5 w-5" aria-hidden />
          Give someone access
        </h2>

        <label className="flex flex-col gap-2">
          <span className="text-base font-semibold text-text-main">Their Gmail</span>
          <input
            name="email"
            type="email"
            required
            maxLength={160}
            placeholder="helper@gmail.com"
            className="min-h-14 rounded-xl border border-border px-4 text-base text-text-main outline-none focus-visible:border-primary-strong"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-base font-semibold text-text-main">What can they do</span>
          <select
            name="role"
            defaultValue="STAFF"
            className="min-h-14 rounded-xl border border-border bg-white px-4 text-base text-text-main outline-none focus-visible:border-primary-strong"
          >
            <option value="STAFF">Helper — mark who came, no money</option>
            <option value="OWNER">Owner — everything, money too</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-14 cursor-pointer items-center justify-center rounded-xl bg-primary-strong px-6 text-lg font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-base text-red-900"
        >
          {error}
        </p>
      )}
    </div>
  );
}
