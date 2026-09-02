"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", label: "Today" },
  { href: "/checkin", label: "Check-in" },
  { href: "/students", label: "Students" },
  // Money is owner-only. The page itself redirects staff away — this only keeps
  // a tab they cannot use out of their way.
  { href: "/menu", label: "Menu", ownerOnly: true },
  { href: "/fees", label: "Fees", ownerOnly: true },
];

export function MessNav({ messId, canSeeFees }: { messId: string; canSeeFees: boolean }) {
  const pathname = usePathname();
  const base = `/mess/${messId}`;

  return (
    <nav className="flex gap-2">
      {TABS.filter((tab) => canSeeFees || !tab.ownerOnly).map((tab) => {
        const href = `${base}${tab.href}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary-strong text-white"
                : "bg-muted text-text-muted hover:text-text-main",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
