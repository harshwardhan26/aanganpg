/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useTransition } from "react";
import { updateLeadStatus } from "@/actions/admin";

export default function LeadRow({ lead }: { lead: any }) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    startTransition(async () => {
      await updateLeadStatus(lead.id, newStatus);
    });
  };

  const whatsappMessage = lead.property
    ? `Hi ${lead.name}, you enquired about ${lead.property.title}. Are you still looking for a room?`
    : `Hi ${lead.name}, you enquired about rooms on Aangan. Are you still looking?`;
    
  const waUrl = `https://wa.me/${lead.phone.replace("+", "")}?text=${encodeURIComponent(whatsappMessage)}`;
  const telUrl = `tel:${lead.phone}`;

  return (
    <tr className={isPending ? "opacity-50" : ""}>
      <td className="px-4 py-3">
        <div className="font-medium text-text-main">{lead.name}</div>
        <div className="text-xs text-text-muted mt-1">{lead.phone}</div>
      </td>
      <td className="px-4 py-3">
        {lead.property ? (
          <div className="text-sm">
            <span className="font-medium text-text-main">{lead.property.title}</span>
            <div className="text-xs text-text-muted">₹{lead.property.price}</div>
          </div>
        ) : (
          <span className="text-sm text-text-muted">General Enquiry</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="capitalize">{lead.source}</div>
        <div className="text-xs text-text-muted mt-1">
          {new Date(lead.createdAt).toLocaleString("en-IN", {
            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
          })}
        </div>
      </td>
      <td className="px-4 py-3">
        <select 
          value={lead.status}
          onChange={handleStatusChange}
          disabled={isPending}
          className="text-sm border rounded p-1"
        >
          <option value="New">New</option>
          <option value="Called">Called</option>
          <option value="Moved in">Moved in</option>
          <option value="Dead">Dead</option>
        </select>
      </td>
      <td className="px-4 py-3 text-right space-x-3">
        <a href={telUrl} className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Call
        </a>
        <a href={waUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-green-600 hover:text-green-800">
          WhatsApp
        </a>
      </td>
    </tr>
  );
}
