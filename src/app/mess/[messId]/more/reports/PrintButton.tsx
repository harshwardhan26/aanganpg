"use client";

export function PrintButton() { return <button type="button" onClick={() => window.print()} className="min-h-12 rounded-xl bg-primary-strong px-5 text-base font-semibold text-white print:hidden">Print or save PDF</button>; }
