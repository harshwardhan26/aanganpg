import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import ListingForm from "../ListingForm";

export default async function NewListingPage() {
  const colleges = await prisma.college.findMany({
    orderBy: { name: "asc" }
  });

  return (
    <div className="space-y-6">
      <Link
        href="/admin/listings"
        className="inline-flex min-h-11 items-center gap-1.5 -ml-1 px-1 text-sm font-medium text-text-muted hover:text-text-main"
      >
        <ChevronLeft className="h-4 w-4" />
        All listings
      </Link>
      <h2 className="font-heading text-2xl font-bold text-text-main">New Listing</h2>
      <ListingForm colleges={colleges} />
    </div>
  );
}
