import Link from "next/link";
import { UtensilsCrossed, ChartNoAxesCombined, CookingPot, Megaphone, MessageSquareText, Settings, UsersRound, FileUp, History, ClipboardPenLine } from "lucide-react";

export const metadata = { title: "More tools" };

const tools = [
  { href: "/menu", label: "Food menu", detail: "Weekly menu and serving times", icon: UtensilsCrossed },
  { href: "/more/reports", label: "Reports", detail: "Collections, reconciliation, and print view", icon: ChartNoAxesCombined },
  { href: "/more/kitchen", label: "Kitchen planning", detail: "Expected meals and leftovers", icon: CookingPot },
  { href: "/more/notices", label: "Notices", detail: "Updates for students and staff", icon: Megaphone },
  { href: "/more/feedback", label: "Feedback", detail: "Private student issues", icon: MessageSquareText },
  { href: "/more/attendance", label: "Correct attendance", detail: "Owner-only corrections with reasons", icon: ClipboardPenLine },
  { href: "/more/import", label: "Import students", detail: "Add a roster from CSV", icon: FileUp },
  { href: "/more/access", label: "People and access", detail: "Invite owners and helpers", icon: UsersRound },
  { href: "/more/activity", label: "Activity history", detail: "Financial and operational audit trail", icon: History },
  { href: "/more/setup", label: "Mess setup", detail: "Details, due date, QR, and plan", icon: Settings },
];

export default async function MorePage({ params }: { params: Promise<{ messId: string }> }) {
  const { messId } = await params;
  return <div><h1 className="font-heading text-3xl font-bold text-text-main">More tools</h1><p className="mt-1 text-base text-text-muted">Setup, reporting, and everyday operations.</p><ul className="mt-6 grid gap-3 sm:grid-cols-2">{tools.map((tool) => { const Icon = tool.icon; return <li key={tool.href}><Link href={`/mess/${messId}${tool.href}`} className="flex min-h-24 items-center gap-4 rounded-2xl border-2 border-border bg-white p-4 transition-colors hover:bg-muted"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-primary-strong"><Icon className="h-6 w-6" aria-hidden /></span><span><span className="block text-lg font-semibold text-text-main">{tool.label}</span><span className="mt-0.5 block text-sm text-text-muted">{tool.detail}</span></span></Link></li>; })}</ul></div>;
}
