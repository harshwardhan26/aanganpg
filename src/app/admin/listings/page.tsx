import prisma from "@/lib/prisma";
import Link from "next/link";
import { markFull, markClosed, softDelete } from "@/actions/admin";

export default async function AdminListingsPage() {
  // eslint-disable-next-line react-hooks/purity
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const listings = await prisma.property.findMany({
    include: {
      college: true,
      _count: {
        select: { leads: { where: { createdAt: { gte: oneWeekAgo } } } }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold font-heading text-text-main">Listings</h2>
        <Link 
          href="/admin/listings/new" 
          className="bg-primary-strong hover:bg-primary-hover text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
        >
          + New Listing
        </Link>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-text-muted border-b border-border">
            <tr>
              <th className="px-4 py-3 font-medium">Property</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Leads (7d)</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {listings.map(listing => {
              const isClosed = !!listing.closedAt;
              const isDeleted = !!listing.deletedAt;
              const isFull = listing.vacantBeds === 0;
              const leadsThisWeek = listing._count.leads;
              const showWarning = !isDeleted && !isClosed && leadsThisWeek < 1;

              return (
                <tr key={listing.id} className={isDeleted ? "opacity-50" : ""}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-main">
                      <Link href={`/admin/listings/${listing.id}/edit`} className="hover:underline">
                        {listing.title}
                      </Link>
                    </div>
                    <div className="text-xs text-text-muted mt-1">{listing.college?.shortName || listing.college?.name} • ₹{listing.price}</div>
                  </td>
                  <td className="px-4 py-3">
                    {isDeleted ? (
                      <span className="text-red-600 font-medium">Deleted</span>
                    ) : isClosed ? (
                      <span className="text-slate-500 font-medium">Closed</span>
                    ) : isFull ? (
                      <span className="text-orange-600 font-medium">Full</span>
                    ) : (
                      <span className="text-green-600 font-medium">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{leadsThisWeek}</span>
                      {showWarning && (
                        <span className="text-xs text-orange-600 font-medium bg-orange-50 px-1.5 py-0.5 rounded" title="Supply and demand not matched">
                          Low
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {!isDeleted && (
                      <>
                        {!isFull && !isClosed && (
                          <form action={markFull.bind(null, listing.id)} className="inline-block">
                            <button className="text-orange-600 hover:text-orange-800 text-xs font-medium">Mark Full</button>
                          </form>
                        )}
                        {!isClosed && (
                          <form action={markClosed.bind(null, listing.id)} className="inline-block">
                            <button className="text-slate-600 hover:text-slate-800 text-xs font-medium">Close</button>
                          </form>
                        )}
                        <form action={softDelete.bind(null, listing.id)} className="inline-block">
                          <button className="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>
                        </form>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {listings.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-text-muted">
                  No listings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
