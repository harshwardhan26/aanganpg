import Link from "next/link";
import { Home } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyRooms() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-border rounded-xl bg-slate-50/50 my-8">
      <div className="bg-white p-4 rounded-full shadow-sm mb-4">
        <Home className="w-8 h-8 text-text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-text-main mb-2">No rooms found</h3>
      <p className="text-text-muted max-w-md mb-6 text-sm">
        We only show verified, real listings. Honest availability, no fake data. Be the first to list a property matching these criteria.
      </p>
      <Link href="/list-your-pg" className={cn(buttonVariants({ variant: "default" }), "bg-primary-strong text-white hover:bg-primary-hover")}>
        List your PG &mdash; FREE
      </Link>
    </div>
  );
}
