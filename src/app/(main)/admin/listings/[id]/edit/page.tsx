import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import ListingForm from "../../ListingForm";
import { notFound } from "next/navigation";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [colleges, property] = await Promise.all([
    prisma.college.findMany({ orderBy: { name: "asc" } }),
    prisma.property.findUnique({
      where: { id },
      include: { images: true }
    })
  ]);

  if (!property) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/listings"
        className="inline-flex min-h-11 items-center gap-1.5 -ml-1 px-1 text-sm font-medium text-text-muted hover:text-text-main"
      >
        <ChevronLeft className="h-4 w-4" />
        All listings
      </Link>
      <h2 className="font-heading text-2xl font-bold text-text-main">Edit Listing</h2>
      <ListingForm colleges={colleges} initialData={property} />
    </div>
  );
}
