import Link from "next/link";
import { Menu } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { NavAuth } from "./NavAuth";

export function Navbar() {
  // Every one of these is a real route. They used to be /all, /girls, /boys and
  // /mess, none of which exist — the whole nav was 404s.
  const links = [
    { href: "/search", label: "All rooms" },
    { href: "/search?genderPreference=Female", label: "Girls PG" },
    { href: "/search?genderPreference=Male", label: "Boys PG" },
    { href: "/search?food=yes", label: "With mess" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-light/95 backdrop-blur supports-[backdrop-filter]:bg-light/60">
      <div className="mx-auto flex h-16 max-w-[var(--content-max)] items-center px-4 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center">
          <Link href="/" className="text-primary-strong py-2 block w-fit">
            <Logo height={28} />
          </Link>
        </div>
        
        <nav className="hidden lg:flex flex-none items-center justify-center gap-5 xl:gap-6 mx-4">
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
        
        <div className="flex flex-1 items-center justify-end gap-4">
          <div className="hidden lg:flex items-center gap-4">
            <Link 
              href="/list-your-pg" 
              className={cn(buttonVariants({ variant: "outline" }), "border-border text-text-main hover:bg-light whitespace-nowrap")}
            >
              List your PG &mdash; FREE
            </Link>
            <NavAuth />
          </div>

          <Sheet>
            <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "lg:hidden")}>
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <nav className="flex flex-col gap-2 mt-6">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-lg font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 py-3 px-4 rounded-lg transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex flex-col gap-3 mt-4 pt-6 border-t border-slate-200 px-2">
                  <Link 
                    href="/list-your-pg" 
                    className={cn(buttonVariants({ variant: "outline", size: "lg", className: "w-full border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold" }))}
                  >
                    List your PG &mdash; FREE
                  </Link>
                  <NavAuth className="w-full h-11 text-base font-semibold" />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
