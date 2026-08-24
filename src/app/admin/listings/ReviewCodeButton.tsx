"use client";

import { useState, useTransition } from "react";
import { getReviewCode, generateReviewCode } from "@/actions/admin-review";
import { Key } from "lucide-react";

export function ReviewCodeButton({ propertyId }: { propertyId: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleOpen = async () => {
    setIsOpen(true);
    if (!code) {
      const existing = await getReviewCode(propertyId);
      setCode(existing);
    }
  };

  const handleGenerate = () => {
    startTransition(async () => {
      const newCode = await generateReviewCode(propertyId);
      setCode(newCode);
    });
  };

  return (
    <div className="relative inline-block">
      <button 
        onClick={handleOpen}
        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center gap-1"
      >
        <Key className="w-3 h-3" /> Reviews
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white shadow-lg border border-slate-200 rounded-lg p-4 z-10">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-sm text-slate-800">Review Code</h4>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          
          {code ? (
            <div className="mb-3">
              <div className="bg-slate-100 p-2 rounded text-center font-mono font-bold text-slate-800 tracking-wider">
                {code}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 leading-tight">
                Share this code with residents so they can verify their review.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-600 mb-3">No code generated yet.</p>
          )}

          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 rounded transition-colors"
          >
            {isPending ? "Generating..." : (code ? "Regenerate Code" : "Generate Code")}
          </button>
        </div>
      )}
    </div>
  );
}
