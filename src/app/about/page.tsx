import { Metadata } from "next";
import { getAanganPhone, formatAanganPhoneForDisplay } from "@/lib/contact";
import Image from "next/image";

export const metadata: Metadata = {
  title: "About Us | Aangan Kolhapur",
  description: "Aangan is built in Kolhapur, for Kolhapur. Get to know the team behind the most trusted student room platform in the city.",
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
            <div className="space-y-4">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-200">
                {/* Fallback image representing the founders/team */}
                <Image
                  src="https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
                  alt="Aangan Team Member"
                  width={400}
                  height={400}
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="w-full h-full object-cover grayscale"
                />
              </div>
              <div>
                <h3 className="font-bold text-lg text-text-main">Harshwardhan</h3>
                <p className="text-text-muted">Founder & Operations</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-200">
                {/* Fallback image representing the founders/team */}
                <Image
                  src="https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
                  alt="Aangan Team Member"
                  width={400}
                  height={400}
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="w-full h-full object-cover grayscale"
                />
              </div>
              <div>
                <h3 className="font-bold text-lg text-text-main">Aangan Team</h3>
                <p className="text-text-muted">Local Verification Unit</p>
              </div>
            </div>
          </div>

          <div className="bg-light p-8 sm:p-10 rounded-2xl border border-border space-y-8">
            <h2 className="text-2xl font-bold font-heading text-text-main">Reach out to us</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              
              <div className="space-y-2">
                <h3 className="font-semibold text-text-main uppercase tracking-wider text-sm">Call or WhatsApp</h3>
                <p className="text-lg text-text-main font-medium">
                  <a href={`tel:${phone}`} className="hover:text-primary-strong transition-colors">{displayPhone}</a>
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
