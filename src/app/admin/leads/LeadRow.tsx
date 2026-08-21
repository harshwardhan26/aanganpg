/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useTransition, useState } from "react";
import { updateLeadDetails } from "@/actions/admin";
import { MessageCircle, Phone, Calendar as CalendarIcon, Save } from "lucide-react";

const STAGES = [
  { value: "NEW", label: "New", color: "bg-blue-100 text-blue-800" },
  { value: "CONTACTED", label: "Contacted", color: "bg-amber-100 text-amber-800" },
  { value: "VISITED", label: "Visited PG", color: "bg-purple-100 text-purple-800" },
  { value: "CONVERTED", label: "Converted", color: "bg-green-100 text-green-800" },
  { value: "LOST", label: "Lost", color: "bg-slate-100 text-slate-800" },
];

export default function LeadRow({ lead }: { lead: any }) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(lead.notes || "");
  const [followupDate, setFollowupDate] = useState(
    lead.followupDate ? new Date(lead.followupDate).toISOString().split('T')[0] : ""
  );

  const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStage = e.target.value;
    startTransition(async () => {
      await updateLeadDetails(lead.id, { stage: newStage });
    });
  };

  const handleNotesSave = () => {
    if (notes === (lead.notes || "")) return;
    startTransition(async () => {
      await updateLeadDetails(lead.id, { notes: notes.trim() || null });
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFollowupDate(val);
    startTransition(async () => {
      await updateLeadDetails(lead.id, { followupDate: val ? new Date(val) : null });
    });
  };

  const disclaimer = `🚨 *Disclaimer*: Aangan NEVER asks for any deposit or booking money. Please do not pay anyone claiming to be from Aangan. 🚨`;

  const ownerMessage = lead.property
    ? `Hi ${lead.name}, here are the details for ${lead.property.title} you requested on Aangan.\n\nOwner: ${lead.property.ownerName || "the owner"}\nPhone: ${lead.property.ownerPhone}\n\nPlease contact them directly to schedule a visit or ask about the deposit!\n\n${disclaimer}`
    : `Hi ${lead.name}, you enquired about rooms on Aangan. Are you still looking?`;
    
  const waUrl = `https://wa.me/${lead.phone.replace("+", "")}?text=${encodeURIComponent(ownerMessage)}`;
  const telUrl = `tel:${lead.phone}`;

  const currentStage = STAGES.find(s => s.value === lead.stage) || STAGES[0];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fDate = lead.followupDate ? new Date(lead.followupDate) : null;
  const isOverdue = fDate && fDate < today && lead.stage !== 'CONVERTED' && lead.stage !== 'LOST';
  const isToday = fDate && fDate.getTime() === today.getTime() && lead.stage !== 'CONVERTED' && lead.stage !== 'LOST';

  return (
    <div className={`flex flex-col sm:flex-row gap-4 px-6 py-5 border-b border-slate-100 hover:bg-slate-50 transition-colors ${isPending ? "opacity-50" : ""}`}>
      {/* Student Details */}
      <div className="w-full sm:w-1/4 shrink-0 space-y-1">
        <p className="font-bold text-slate-900">{lead.name}</p>
        <div className="flex items-center gap-2">
          <p className="text-slate-600 font-mono text-sm">{lead.phone}</p>
          <a href={telUrl} className="text-slate-400 hover:text-slate-900" title="Call Student">
            <Phone className="w-3.5 h-3.5" />
          </a>
        </div>
        <p className="text-xs text-slate-400">
          Source: <span className="font-semibold uppercase tracking-wider">{lead.source}</span>
        </p>
        <p className="text-xs text-slate-400">
          {new Date(lead.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </div>

      {/* Action Buttons & Pipeline */}
      <div className="w-full sm:w-1/4 shrink-0 space-y-3">
        <select
          value={lead.stage}
          onChange={handleStageChange}
          disabled={isPending}
          className={`w-full text-sm font-semibold border-0 rounded-md py-1.5 px-3 ring-1 ring-inset ring-slate-200 cursor-pointer ${currentStage.color}`}
        >
          {STAGES.map(s => (
            <option key={s.value} value={s.value} className="bg-white text-slate-900">{s.label}</option>
          ))}
        </select>
        
        <a 
          href={waUrl} 
          target="_blank" 
          rel="noreferrer" 
          className="flex items-center justify-center gap-2 w-full bg-[#25d366] hover:bg-[#20b858] text-white text-sm font-medium py-1.5 px-3 rounded-md transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Send Owner Details
        </a>
      </div>

      {/* Notes and Follow-up */}
      <div className="w-full sm:w-2/4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <CalendarIcon className={`w-4 h-4 ${isOverdue ? "text-red-500" : isToday ? "text-amber-500" : "text-slate-400"}`} />
          <input 
            type="date"
            value={followupDate}
            onChange={handleDateChange}
            disabled={isPending}
            className={`text-sm border-0 bg-transparent p-0 w-32 cursor-pointer ring-0 focus:ring-0 ${isOverdue ? "text-red-600 font-bold" : isToday ? "text-amber-600 font-bold" : "text-slate-600"}`}
          />
          {isOverdue && <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">OVERDUE</span>}
          {isToday && <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded">TODAY</span>}
        </div>
        <div className="relative">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesSave}
            placeholder="Add notes about the student's requirements or objections..."
            disabled={isPending}
            className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-md p-2 min-h-[60px] focus:ring-1 focus:ring-primary-strong focus:border-primary-strong resize-y"
          />
          {notes !== (lead.notes || "") && (
            <button 
              onClick={handleNotesSave}
              className="absolute bottom-2 right-2 p-1.5 bg-slate-100 text-slate-600 hover:bg-primary-strong hover:text-white rounded transition-colors shadow-sm"
              title="Save notes"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
