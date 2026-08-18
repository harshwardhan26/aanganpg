import { Metadata } from "next";

export const metadata: Metadata = {
  title: "What Aangan Verification Means | Aangan",
  description: "Learn exactly what an Aangan verification visit checks, and what it does not check. We value honesty and never make false safety guarantees.",
  alternates: {
    canonical: "/verification"
  }
};

export default function VerificationPage() {
  return (
    <main className="min-h-screen bg-light py-12 lg:py-24">
      <div className="max-w-[var(--content-max)] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="space-y-6 text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-main leading-tight font-heading">
              What Aangan Verification Means
            </h1>
            <p className="text-xl text-text-muted">
              We believe in radical honesty. Here is exactly what happens when we verify a room, and what we do not check.
            </p>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-border space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-text-main flex items-center gap-3">
                <span className="flex h-8 w-8 bg-green-100 text-green-700 rounded-full items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </span>
                What we check
              </h2>
              <ul className="space-y-4 text-text-main text-lg ml-11">
                <li><strong className="font-semibold">Physical Visit:</strong> We stood in the room ourselves. We do not accept photos sent over WhatsApp by owners.</li>
                <li><strong className="font-semibold">Honest Photography:</strong> We took every photo on this site ourselves. We never use wide-angle lenses to make rooms look bigger. We photograph the bathroom.</li>
                <li><strong className="font-semibold">Owner Meeting:</strong> We met the owner in person.</li>
                <li><strong className="font-semibold">Fact Confirmation:</strong> We confirmed the rent, the deposit, and the gate timing directly with the owner on the day of the visit.</li>
              </ul>
            </div>

            <hr className="border-border" />

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-text-main flex items-center gap-3">
                <span className="flex h-8 w-8 bg-red-100 text-primary-strong rounded-full items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </span>
                What we do NOT check
              </h2>
              <ul className="space-y-4 text-text-main text-lg ml-11">
                <li><strong className="font-semibold">No Tenant Vetting:</strong> We do not run background checks or vet the other students/tenants currently living in the PG.</li>
                <li><strong className="font-semibold">No Structural Inspections:</strong> We are not civil engineers or electricians. We do not inspect the wiring, the plumbing, or the structural integrity of the building.</li>
                <li><strong className="font-semibold">No Safety Guarantees:</strong> We do not provide any guarantee regarding your physical safety, the security of your belongings, or the behavior of the owner.</li>
              </ul>
            </div>
          </div>

          <p className="text-center text-text-muted text-sm">
            Our verification is a record of a single point in time. Things may change after our visit. Always visit the property yourself before paying any deposit.
          </p>

        </div>
      </div>
    </main>
  );
}
