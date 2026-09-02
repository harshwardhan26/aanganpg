import { Metadata } from "next";
import Image from "next/image";
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
            <div className="bg-light p-6 rounded-2xl border border-border flex flex-col items-center sm:items-start text-center sm:text-left">
              <div className="relative w-32 h-32 mb-4 overflow-hidden rounded-full border-4 border-white shadow-sm">
                <Image src="/images/harshwardhan.jpg" alt="Harshwardhan Patil" fill style={{ objectFit: "cover" }} className="object-cover" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-xl text-text-main">Harshwardhan Patil</h3>
                <p className="text-primary-strong font-medium">Founder</p>
              </div>
              <p className="text-text-muted leading-relaxed pt-3">
                Building the thing Kolhapur should have had ten years ago. Room by room.
              </p>
            </div>
            
            <div className="bg-light p-6 rounded-2xl border border-border flex flex-col items-center sm:items-start text-center sm:text-left">
              <div className="relative w-32 h-32 mb-4 overflow-hidden rounded-full border-4 border-white shadow-sm">
                <Image src="/images/purushottam.jpg" alt="Purushottam Patil" fill style={{ objectFit: "cover" }} className="object-cover" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-xl text-text-main">Purushottam Patil</h3>
                <p className="text-primary-strong font-medium">Operations</p>
              </div>
              <p className="text-text-muted leading-relaxed pt-3">
                Our local operations lead. Checks the amenities, records the facts, takes the real photos. (Note: we check details, but we do not verify safety).
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
                  Rankala Mhada Sankul,<br />
                  near ruggedial gym, old vashinaka<br />
                  Kolhapur 416012
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
