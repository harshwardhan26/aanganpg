"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateLeadDetails, deleteOwnerLead } from "@/actions/admin";
import { LEAD_STAGES, type LeadStage } from "@/lib/property-options";
import { followupState } from "@/lib/lead-filters";
import { cn } from "@/lib/utils";
import { MessageCircle, Phone, Check, Building2, Home, Trash2 } from "lucide-react";

/**
 * Labels and colours for `LEAD_STAGES`, which is the list the action validates
 * against. Every pair here is asserted at >= 4.5:1 in `scripts/selfcheck.ts`.
 */
const STAGE_STYLE: Record<LeadStage, { label: string; className: string }> = {
  NEW: { label: "New", className: "bg-blue-100 text-blue-900" },
  CONTACTED: { label: "Contacted", className: "bg-amber-100 text-amber-900" },
  VISITED: { label: "Visited", className: "bg-purple-100 text-purple-900" },
  CONVERTED: { label: "Converted", className: "bg-green-100 text-green-900" },
  LOST: { label: "Lost", className: "bg-slate-200 text-slate-800" },
};

/** The shape the leads page selects. Narrower than `Lead` on purpose. */
export type LeadCardData = {
  id: string;
  name: string;
  phone: string;
  kind: string;
  hostelName: string | null;
  stage: string;
  source: string;
  notes: string | null;
  followupDate: Date | null;
  createdAt: Date;
  property: {
    id: string;
    title: string;
    slug: string;
    ownerName: string | null;
    ownerPhone: string | null;
  } | null;
};

const DISCLAIMER =
  "🚨 *Disclaimer*: Aangan NEVER asks for any deposit or booking money. Please do not pay anyone claiming to be from Aangan. 🚨";

/**
 * What the WhatsApp button sends.
 *
 * For an owner this is a pitch, not a handover: they are the one being sold to,
 * so sending them another owner's phone number would be nonsense.
 */
function ownerMessage(lead: LeadCardData) {
  if (lead.kind === "owner") {
    const place = lead.hostelName ? ` about ${lead.hostelName}` : "";
    return (
      `Namaskar ${lead.name}, this is Aangan${place}. ` +
      `We visit and photograph every hostel ourselves and send you student enquiries directly on WhatsApp. ` +
      `Listing is free. When would be a good time to visit?`
    );
  }
  const property = lead.property;
  if (!property) {
    return `Hi ${lead.name}, you enquired on Aangan. Are you still looking?`;
  }
  if (!property.ownerPhone) {
    return `Hi ${lead.name}, you enquired about ${property.title} on Aangan. Are you still looking?`;
  }
  return (
    `Hi ${lead.name}, here are the details for ${property.title} you requested on Aangan.\n\n` +
    `Owner: ${property.ownerName || "the owner"}\n` +
    `Phone: ${property.ownerPhone}\n\n` +
    `Please contact them directly to schedule a visit or ask about the deposit!\n\n${DISCLAIMER}`
  );
}

export function LeadCard({ lead, now }: { lead: LeadCardData; now: Date }) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(lead.notes || "");
  const [followup, setFollowup] = useState(
    lead.followupDate ? new Date(lead.followupDate).toISOString().split("T")[0] : "",
  );
  /**
   * The old row's only feedback was the whole thing going 50% transparent, which
   * reads as broken rather than as saving. A short-lived "Saved" flag says what
   * actually happened.
   */
  const [savedAt, setSavedAt] = useState(0);

  const save = (data: Parameters<typeof updateLeadDetails>[1]) => {
    startTransition(async () => {
      await updateLeadDetails(lead.id, data);
      setSavedAt(Date.now());
    });
  };

  const isOwner = lead.kind === "owner";
  const [confirmDelete, setConfirmDelete] = useState(false);
  const notesDirty = notes !== (lead.notes || "");
  const stage = (LEAD_STAGES as readonly string[]).includes(lead.stage)
    ? (lead.stage as LeadStage)
    : "NEW";
  const due = followupState(lead.followupDate, lead.stage, now);

  const waUrl = `https://wa.me/${lead.phone.replace("+", "")}?text=${encodeURIComponent(ownerMessage(lead))}`;

  return (
    <article
      className={cn(
        "rounded-xl border border-border bg-white p-4 transition-opacity sm:p-5",
        due === "overdue" && "border-l-4 border-l-red-600",
        due === "today" && "border-l-4 border-l-amber-600",
        isPending && "opacity-60",
      )}
    >
      {/* WHO — the two things you need before you tap Call. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-heading text-lg font-bold text-text-main">{lead.name}</h3>
          <p className="font-mono text-sm text-text-muted">{lead.phone}</p>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", STAGE_STYLE[stage].className)}>
          {STAGE_STYLE[stage].label}
        </span>
      </div>

      {/* Which hostel. A student's is a real listing, so it links; an owner's is
          free text, because signing them up is what the call is for. */}
      {lead.property ? (
        <Link
          href={`/pg/${lead.property.slug}`}
          target="_blank"
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm text-text-muted hover:text-text-main"
        >
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate underline underline-offset-4">{lead.property.title}</span>
        </Link>
      ) : lead.hostelName ? (
        <p className="mt-2 flex min-h-11 items-center gap-1.5 text-sm text-text-main">
          <Home className="h-4 w-4 shrink-0 text-text-muted" />
          <span className="truncate font-medium">{lead.hostelName}</span>
        </p>
      ) : null}

      <p className="text-xs text-text-muted">
        {lead.source} · {new Date(lead.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        {due === "overdue" && <span className="ml-2 font-bold text-red-700">OVERDUE</span>}
        {due === "today" && <span className="ml-2 font-bold text-amber-700">DUE TODAY</span>}
      </p>

      {/* ACT — two full-width, thumb-sized buttons. These are the whole point of
          the screen, so they come before the admin fields, not after them. */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <a
          href={`tel:${lead.phone}`}
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border bg-white text-sm font-semibold text-text-main hover:bg-slate-50"
        >
          <Phone className="h-5 w-5" />
          Call
        </a>
        <a
          href={waUrl}
          target="_blank"
          rel="noreferrer"
          // Dark green on WhatsApp green. White on #25d366 is 1.8:1 and is named
          // in AGENTS.md as forbidden; this pair is 4.9:1.
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-whatsapp text-sm font-semibold text-whatsapp-dark hover:bg-[#1da851]"
        >
          <MessageCircle className="h-5 w-5" />
          {isOwner ? "Pitch" : "Send details"}
        </a>
      </div>

      {/* TRACK — stacked on a phone, side by side from `lg`. Never three-up. */}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Stage
          </span>
          <select
            value={stage}
            disabled={isPending}
            onChange={(e) => save({ stage: e.target.value })}
            className="min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm font-medium text-text-main"
          >
            {LEAD_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_STYLE[s].label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Call back on
          </span>
          <input
            type="date"
            value={followup}
            disabled={isPending}
            onChange={(e) => {
              setFollowup(e.target.value);
              save({ followupDate: e.target.value ? new Date(e.target.value) : null });
            }}
            // A real bordered field. The old one was a 128px borderless input
            // that did not read as something you could tap.
            className="min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-text-main"
          />
        </label>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notesDirty && save({ notes: notes.trim() || null })}
          disabled={isPending}
          placeholder="What did they say? Budget, objections, when they want to move in."
          className="min-h-[72px] w-full resize-y rounded-lg border border-border bg-white p-3 text-sm text-text-main focus:border-primary-strong"
        />
        <div className="mt-2 flex min-h-11 items-center justify-end gap-3">
          {/* Owner leads are a to-do list and can be thrown away. Student leads
              are a record of someone contacting a hostel, so they have no
              delete — `deleteOwnerLead` refuses them server-side too. */}
          {isOwner && (
            <button
              type="button"
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                startTransition(async () => {
                  await deleteOwnerLead(lead.id);
                });
              }}
              onBlur={() => setConfirmDelete(false)}
              disabled={isPending}
              className={cn(
                "mr-auto flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium",
                confirmDelete
                  ? "bg-red-600 text-white"
                  : "text-text-muted hover:bg-red-50 hover:text-red-900",
              )}
            >
              <Trash2 className="h-4 w-4" />
              {confirmDelete ? "Delete it?" : "Delete"}
            </button>
          )}
          {savedAt > 0 && !notesDirty && !isPending && (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-800">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
          {notesDirty && (
            <button
              type="button"
              onClick={() => save({ notes: notes.trim() || null })}
              disabled={isPending}
              className="min-h-11 rounded-lg bg-primary-strong px-5 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              Save notes
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
