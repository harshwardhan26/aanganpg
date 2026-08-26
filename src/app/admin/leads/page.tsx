import prisma from "@/lib/prisma";
import Link from "next/link";
import LeadRow from "./LeadRow";

/**
 * Listings per page.
 *
 * This page used to load every property that has ever had a lead, with every
 * one of those leads attached and no limit on either. Fine at fifty leads,
 * unusable at five thousand — and June is when we would have found out.
 */
const PER_PAGE = 10;
/** Leads shown per listing before the card says "and N more". */
const LEADS_PER_PROPERTY = 25;

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function AdminLeadsPage(props: PageProps) {
  const { page: rawPage } = await props.searchParams;
  const page = Math.max(1, Number(rawPage) || 1);

  const where = { leads: { some: {} } };

  const [propertiesWithLeads, totalProperties] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        leads: {
          orderBy: { createdAt: "desc" },
          take: LEADS_PER_PROPERTY,
        },
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.property.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalProperties / PER_PAGE));

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
                  {property._count.leads} {property._count.leads === 1 ? 'Lead' : 'Leads'}
                </div>
              </div>
              
              <div className="flex flex-col">
                {property.leads.map(lead => (
                  <LeadRow key={lead.id} lead={lead} property={property} />
                ))}
                {property._count.leads > property.leads.length && (
                  <p className="px-6 py-3 text-sm text-slate-500 border-t border-slate-100">
                    Showing the {LEADS_PER_PROPERTY} most recent of {property._count.leads} leads.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="Lead pages" className="flex items-center justify-between gap-4 pt-2">
          {page > 1 ? (
            <Link href={`/admin/leads?page=${page - 1}`} className="text-sm font-medium text-primary-strong hover:underline">
              ← Previous
            </Link>
          ) : <span />}

          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>

          {page < totalPages ? (
            <Link href={`/admin/leads?page=${page + 1}`} className="text-sm font-medium text-primary-strong hover:underline">
              Next →
            </Link>
          ) : <span />}
        </nav>
      )}
    </div>
  );
}
