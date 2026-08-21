import prisma from "@/lib/prisma";
import Link from "next/link";
import LeadRow from "./LeadRow";

export default async function AdminLeadsPage() {
  // Fetch properties that have leads
  const propertiesWithLeads = await prisma.property.findMany({
    where: {
      leads: {
        some: {}
      }
    },
    include: {
      leads: {
        orderBy: {
          createdAt: "desc"
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold font-heading text-text-main">Lead Dashboard</h2>
      </div>

      {propertiesWithLeads.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center text-slate-500">
          No leads recorded yet.
        </div>
      ) : (
        <div className="space-y-8">
          {propertiesWithLeads.map(property => (
            <div key={property.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    <Link href={`/pg/${property.slug}`} className="hover:text-primary-strong hover:underline" target="_blank">
                      {property.title}
                    </Link>
                  </h2>
                  <p className="text-slate-600 font-medium mt-1">
                    Owner Phone: <a href={`tel:${property.ownerPhone}`} className="text-primary-strong hover:underline">{property.ownerPhone || "No phone"}</a>
                    {property.ownerName ? ` (${property.ownerName})` : ''}
                  </p>
                  <p className="text-slate-500 text-sm mt-0.5">Call the owner to confirm conversions.</p>
                </div>
                <div className="shrink-0 bg-primary-strong text-white px-3 py-1 rounded-full text-sm font-semibold">
                  {property.leads.length} {property.leads.length === 1 ? 'Lead' : 'Leads'}
                </div>
              </div>
              
              <div className="flex flex-col">
                {property.leads.map(lead => (
                  <LeadRow key={lead.id} lead={lead} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
