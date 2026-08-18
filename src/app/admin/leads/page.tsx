import prisma from "@/lib/prisma";
import LeadRow from "./LeadRow";
import Link from "next/link";

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: { source?: string };
}) {
  const sourceFilter = searchParams.source;

  const leads = await prisma.lead.findMany({
    where: sourceFilter ? { source: sourceFilter } : undefined,
    include: {
      property: true
    },
    orderBy: { createdAt: "desc" }
  });

  const sources = await prisma.lead.groupBy({
    by: ['source'],
    _count: true
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold font-heading text-text-main">Lead Inbox</h2>
        
        <div className="flex flex-wrap gap-2">
          <Link 
            href="/admin/leads" 
            className={`px-3 py-1.5 rounded-full text-sm font-medium border ${!sourceFilter ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
          >
            All
          </Link>
          {sources.map(s => (
            <Link 
              key={s.source}
              href={`/admin/leads?source=${s.source}`} 
              className={`px-3 py-1.5 rounded-full text-sm font-medium border ${sourceFilter === s.source ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
            >
              {s.source} <span className="opacity-70 ml-1">({s._count})</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-text-muted border-b border-border">
            <tr>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Property</th>
              <th className="px-4 py-3 font-medium">Source / Time</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.map(lead => (
              <LeadRow key={lead.id} lead={lead} />
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  No leads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
