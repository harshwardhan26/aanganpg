import prisma from "@/lib/prisma";
import ListingForm from "../../ListingForm";
import { notFound } from "next/navigation";

export default async function EditListingPage({ params }: { params: { id: string } }) {
  const [colleges, property] = await Promise.all([
    prisma.college.findMany({ orderBy: { name: "asc" } }),
    prisma.property.findUnique({
      where: { id: params.id },
      include: { images: true }
    })
  ]);

  if (!property) notFound();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-heading text-text-main">Edit Listing</h2>
      <ListingForm colleges={colleges} initialData={property} />
    </div>
  );
}
