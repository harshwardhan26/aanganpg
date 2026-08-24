"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { NavAuth } from "./NavAuth";
import { ListPgButton } from "./ListPgButton";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  // Every one of these is a real route. They used to be /all, /girls, /boys and
  // /mess, none of which exist — the whole nav was 404s.
  const links = [
    { href: "/search", label: "All rooms" },
    { href: "/search?genderPreference=Female", label: "Girls Hostels" },
    { href: "/search?genderPreference=Male", label: "Boys Hostels" },
    { href: "/search?food=yes", label: "With mess" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-light/95 backdrop-blur supports-[backdrop-filter]:bg-light/60">
      <div className="mx-auto flex h-16 w-full items-center px-6 md:px-10 max-w-7xl">
        <div className="flex flex-1 items-center justify-start">
          <Link href="/" className="text-primary-strong py-2 flex items-center gap-2.5 w-fit">
            <Logo height={32} />
            <span className="hidden sm:inline-block text-xs font-semibold text-text-muted mt-0.5 tracking-wide">Kolhapur</span>
          </Link>
        </div>
        
        <nav className="hidden lg:flex flex-1 items-center justify-center gap-6 xl:gap-8 mx-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-text-muted hover:text-text-main transition-colors whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        
        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4">
          <div className="hidden lg:flex items-center gap-4">
            <NavAuth />
          </div>

          <div className="flex items-center lg:hidden">
            <NavAuth mode="login-only" className="h-9 px-2 text-sm font-medium" />
          </div>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "lg:hidden")}>
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] sm:w-[350px] bg-white p-6 outline-none">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <nav className="flex flex-col gap-1 mt-8">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="text-base font-medium text-text-main hover:text-primary-strong hover:bg-slate-50 py-3 px-4 rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-strong"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-border px-2" onClick={() => setIsOpen(false)}>
                  <ListPgButton 
                    size="lg"
                    className="w-full border-border text-text-main hover:bg-slate-50 font-semibold rounded-xl" 
                  />
                  <NavAuth mode="authenticated-only" className="w-full h-11 text-base font-semibold rounded-xl" />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
