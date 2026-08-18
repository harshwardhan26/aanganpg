import prisma from "@/lib/prisma";
import ListingForm from "../ListingForm";

export default async function NewListingPage() {
  const colleges = await prisma.college.findMany({
    orderBy: { name: "asc" }
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-heading text-text-main">New Listing</h2>
      <ListingForm colleges={colleges} />
    </div>
  );
}
