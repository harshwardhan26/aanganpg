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
      <div className="mx-auto flex h-16 max-w-[var(--content-max)] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-primary-strong">
            <Logo height={28} />
          </Link>
          <nav className="hidden lg:flex items-center gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-text-muted hover:text-text-main transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-4">
            <NavAuth />
            <Link 
              href="/list-your-pg" 
              className={cn(buttonVariants({ variant: "default" }), "bg-primary-strong text-white hover:bg-primary-hover")}
            >
              List your PG &mdash; FREE
            </Link>
          </div>

          <Sheet>
            <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "lg:hidden")}>
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <nav className="flex flex-col gap-4 mt-8">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-lg font-medium text-text-main"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-border">
                  <NavAuth className="w-full justify-start border border-border" />
                  <Link 
                    href="/list-your-pg" 
                    className={cn(buttonVariants({ variant: "default", className: "w-full justify-start" }), "bg-primary-strong text-white hover:bg-primary-hover")}
                  >
                    List your PG &mdash; FREE
                  </Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
