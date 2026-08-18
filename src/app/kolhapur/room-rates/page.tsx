import prisma from "@/lib/prisma";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const revalidate = 86400; // Cache for 24 hours

export const metadata: Metadata = {
  title: "कोल्हापूर रूम रेट लिस्ट २०२६ — एरिया नुसार | Aangan",
  description: "कोल्हापूर मधील विविध भागांतील रूम आणि पीजी चे दर. विथ मेस आणि विदाऊट मेस रेट्सची अधिकृत यादी.",
  alternates: {
    canonical: "/kolhapur/room-rates"
  }
};

function median(values: number[]) {
  if (values.length === 0) return 0;
  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  return values.length % 2 !== 0 ? values[mid] : Math.round((values[mid - 1] + values[mid]) / 2);
}

export default async function RatesPage() {
  const rooms = await prisma.property.findMany({
    where: { deletedAt: null, closedAt: null },
    include: { college: true },
  });

  const areas: Record<string, typeof rooms> = {};
  for (const r of rooms) {
    const area = r.college?.area || r.location || "Other";
    if (!areas[area]) areas[area] = [];
    areas[area].push(r);
  }

  const stats = Object.entries(areas)
    .map(([area, areaRooms]) => {
      const withMess = areaRooms.filter(r => r.foodType !== null);
      const withoutMess = areaRooms.filter(r => r.foodType === null);
      
      const wmPrices = withMess.map(r => r.price);
      const womPrices = withoutMess.map(r => r.price);
      const deposits = areaRooms.map(r => r.deposit).filter(d => d !== null && d > 0) as number[];

      return {
        area,
        count: areaRooms.length,
        wm: wmPrices.length >= 3 ? {
          min: Math.min(...wmPrices),
          median: median(wmPrices),
          max: Math.max(...wmPrices)
        } : null,
        wom: womPrices.length >= 3 ? {
          min: Math.min(...womPrices),
          median: median(womPrices),
          max: Math.max(...womPrices)
        } : null,
        deposit: deposits.length >= 3 ? median(deposits) : null
      };
    })
    .sort((a, b) => b.count - a.count); // Sort by most listings first

  const shareText = "कोल्हापूर रूम रेट लिस्ट २०२६ — एरिया नुसार पाहण्यासाठी खालील लिंक वर क्लिक करा:\nhttps://aangan.com/rates";
  const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <main className="min-h-screen bg-white py-12 lg:py-20">
      <div className="max-w-[var(--content-max)] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="max-w-3xl space-y-6 mb-12 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-main leading-tight font-heading">
            कोल्हापूर रूम रेट लिस्ट २०२६ — एरिया नुसार
          </h1>
          <p className="text-lg text-text-muted">
            Live rent statistics computed directly from verified PG and room listings across Kolhapur. We require at least 3 listings per category to show data, preventing misleading outliers.
          </p>
          <div className="pt-2">
            <Button render={<a href={shareUrl} target="_blank" rel="noopener noreferrer" />} className="bg-[#25D366] hover:bg-[#1DA851] text-[#05391a] font-bold text-base px-6 h-12 shadow-md">
              Share on WhatsApp
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-light border-b border-border text-text-main text-sm uppercase tracking-wider">
                  <th className="p-4 sm:p-5 font-semibold">Area</th>
                  <th className="p-4 sm:p-5 font-semibold">Without Mess (Monthly)</th>
                  <th className="p-4 sm:p-5 font-semibold">With Mess (Monthly)</th>
                  <th className="p-4 sm:p-5 font-semibold">Typical Deposit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-text-muted">No data available yet.</td>
                  </tr>
                )}
                {stats.map(s => {
                  const hasData = s.wm || s.wom;
                  return (
                    <tr key={s.area} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 sm:p-5 font-medium text-text-main">
                        {s.area} <span className="text-xs text-text-muted ml-1 bg-light px-2 py-0.5 rounded-full border border-border">{s.count} {s.count === 1 ? 'listing' : 'listings'}</span>
                      </td>
                      
                      {!hasData ? (
                        <td colSpan={3} className="p-4 sm:p-5 text-text-muted italic">
                          Not enough data yet (minimum 3 listings required)
                        </td>
                      ) : (
                        <>
                          <td className="p-4 sm:p-5 text-text-main">
                            {s.wom ? (
                              <div>
                                <div className="font-semibold text-base">₹{s.wom.median} <span className="text-xs font-normal text-text-muted">Avg</span></div>
                                <div className="text-sm text-text-muted mt-0.5">₹{s.wom.min} – ₹{s.wom.max}</div>
                              </div>
                            ) : <span className="text-text-muted italic text-sm">Not enough data yet</span>}
                          </td>
                          <td className="p-4 sm:p-5 text-text-main">
                            {s.wm ? (
                              <div>
                                <div className="font-semibold text-base">₹{s.wm.median} <span className="text-xs font-normal text-text-muted">Avg</span></div>
                                <div className="text-sm text-text-muted mt-0.5">₹{s.wm.min} – ₹{s.wm.max}</div>
                              </div>
                            ) : <span className="text-text-muted italic text-sm">Not enough data yet</span>}
                          </td>
                          <td className="p-4 sm:p-5 text-text-main font-medium">
                            {s.deposit ? `₹${s.deposit}` : <span className="text-text-muted">-</span>}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
