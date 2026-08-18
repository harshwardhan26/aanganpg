import { Metadata } from "next";
import { getAanganPhone, formatAanganPhoneForDisplay } from "@/lib/contact";

export const metadata: Metadata = {
  title: "About Us | Aangan Kolhapur",
  description: "Built in Kolhapur. Every room visited in person. No brokerage from students.",
  alternates: {
    canonical: "/about"
  }
};

export default function AboutPage() {
  const phone = getAanganPhone();
  const displayPhone = formatAanganPhoneForDisplay(phone);

  return (
    <main className="min-h-screen bg-white py-12 lg:py-24">
      <div className="max-w-[var(--content-max)] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="max-w-3xl mx-auto space-y-16">
          <div className="space-y-6 text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-main leading-tight font-heading">
              Built in Kolhapur,<br />for Kolhapur.
            </h1>
            <p className="text-xl text-text-muted leading-relaxed">
              We started Aangan because finding a good room shouldn&apos;t mean dealing with fake photos, hidden brokerages, and endless driving around the city.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* TODO: Add real team photos once we have them. Do not use stock images. */}
            <div className="space-y-2 bg-light p-6 rounded-2xl border border-border">
              <h3 className="font-bold text-xl text-text-main">Harshwardhan</h3>
              <p className="text-primary-strong font-medium">Founder & Operations</p>
              <p className="text-text-muted leading-relaxed pt-2">
                Personally visits and inspects properties across Kolhapur so you don&apos;t have to.
              </p>
            </div>
            
            <div className="space-y-2 bg-light p-6 rounded-2xl border border-border">
              <h3 className="font-bold text-xl text-text-main">Aangan Team</h3>
              <p className="text-primary-strong font-medium">Local Verification Unit</p>
              <p className="text-text-muted leading-relaxed pt-2">
                Our local team members who check amenities, confirm the facts with the owner, and take the real photos you see on the site.
              </p>
            </div>
          </div>

          <div className="bg-light p-8 sm:p-10 rounded-2xl border border-border space-y-8">
            <h2 className="text-2xl font-bold font-heading text-text-main">Reach out to us</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              
              <div className="space-y-2">
                <h3 className="font-semibold text-text-main uppercase tracking-wider text-sm">Call or WhatsApp</h3>
                <p className="text-lg text-text-main font-medium -my-2">
                  <a href={`tel:${phone}`} className="inline-block py-2 hover:text-primary-strong transition-colors">{displayPhone}</a>
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-text-main uppercase tracking-wider text-sm">Office Address</h3>
                <p className="text-lg text-text-main leading-relaxed">
                  Aangan Rooms<br />
                  Rajarampuri, 1st Lane<br />
                  Kolhapur, Maharashtra 416008
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
