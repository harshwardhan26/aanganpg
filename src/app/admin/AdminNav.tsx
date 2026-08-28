"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Building2, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One list of destinations, rendered twice: as a top row from `lg` up, and as a
 * fixed bottom tab bar below it. The two renderings share this array, so a link
 * cannot exist on one and go missing on the other — which is exactly what
 * happened to Delete and Export CSV on the listings page.
 *
 * `/admin` needs an exact match. Every other admin path starts with it, so a
 * `startsWith` test would light Dashboard up on every screen.
 */
const LINKS = [
  { href: "/admin", label: "Home", Icon: LayoutDashboard, exact: true },
  { href: "/admin/leads", label: "Leads", Icon: Users, exact: false },
  { href: "/admin/listings", label: "Listings", Icon: Building2, exact: false },
  { href: "/admin/analytics", label: "Numbers", Icon: LineChart, exact: false, ownerOnly: true },
];

export function AdminNav({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();
  const links = LINKS.filter((l) => !l.ownerOnly || isOwner);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* Desktop: a row in the header. */}
      <nav aria-label="Admin sections" className="hidden lg:flex items-center gap-1">
        {links.map(({ href, label, Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-strong/10 text-primary-strong"
                  : "text-text-muted hover:bg-slate-100 hover:text-text-main",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile: a fixed tab bar. `pb-[env(safe-area-inset-bottom)]` keeps the
          labels clear of the iOS home indicator, which otherwise sits on top of
          them. The matching space is reserved by the layout's bottom padding. */}
      <nav
        aria-label="Admin sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.06)] lg:hidden"
      >
        <ul className="flex">
          {links.map(({ href, label, Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    // h-14 exactly, because `--admin-tabbar-h` in globals.css
                    // says 3.5rem + the safe-area inset and the two must agree.
                    "flex h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors",
                    active ? "text-primary-strong" : "text-text-muted",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
