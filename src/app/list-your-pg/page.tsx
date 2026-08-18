import { Metadata } from "next";
import { getAanganPhone, formatAanganPhoneForDisplay } from "@/lib/contact";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "List Your PG or Room | Aangan Kolhapur",
  description: "List your Kolhapur PG or hostel on Aangan for free. We photograph your rooms, give students your direct number, and take zero brokerage.",
  alternates: {
    canonical: "/list-your-pg"
  }
};

export default function ListYourPgPage() {
  const phone = getAanganPhone();
  const displayPhone = formatAanganPhoneForDisplay(phone);

  const whatsappMessage = encodeURIComponent("नमस्कार, मला माझी पीजी/रूम अंगण वर लिस्ट करायची आहे. कृपया संपर्क करा.");
  const waLink = `https://wa.me/${phone.replace("+", "")}?text=${whatsappMessage}`;

  return (
    <main className="min-h-screen bg-light py-12 lg:py-24">
      <div className="max-w-[var(--content-max)] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="max-w-3xl mx-auto space-y-12">
          
          <div className="text-center sm:text-left space-y-6">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-main leading-tight font-heading">
              List your PG on Aangan
            </h1>
            <p className="text-xl text-text-muted max-w-2xl">
              Get verified leads directly on your WhatsApp and phone. No middlemen, no brokerage.
            </p>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-border space-y-10">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-text-main flex items-center gap-2">
                  <span className="flex h-6 w-6 bg-green-100 text-green-700 rounded-full items-center justify-center text-sm">✓</span>
                  What we do
                </h3>
                <ul className="space-y-3 text-text-muted">
                  <li>We photograph your rooms <strong className="text-text-main">for free</strong>.</li>
                  <li>Listing your property is <strong className="text-text-main">100% free</strong>.</li>
                  <li>Students call <strong className="text-text-main">your own number</strong>.</li>
                  <li>We take <strong className="text-text-main">zero cut or brokerage</strong>.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-text-main flex items-center gap-2">
                  <span className="flex h-6 w-6 bg-blue-100 text-blue-700 rounded-full items-center justify-center text-sm">!</span>
                  What we ask
                </h3>
                <ul className="space-y-3 text-text-muted">
                  <li>Let us visit your property <strong className="text-text-main">at least once</strong> for verification.</li>
                  <li>Answer a student&apos;s call or message within <strong className="text-text-main">about an hour</strong>.</li>
                </ul>
              </div>
            </div>

            <hr className="border-border" />

            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-text-main text-center sm:text-left">
                Ready to list? Contact us directly.
              </h2>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button render={<a href={waLink} target="_blank" rel="noopener noreferrer" />} className="flex-1 bg-[#25D366] hover:bg-[#1DA851] text-[#05391a] font-bold text-lg h-14 shadow-md">
                  Message on WhatsApp
                </Button>
                <Button render={<a href={`tel:${phone}`} />} className="flex-1 bg-primary-strong hover:bg-primary-hover text-white font-bold text-lg h-14 shadow-md">
                  <Phone className="w-5 h-5 mr-2" />
                  Call {displayPhone}
                </Button>
              </div>
              <p className="text-center text-sm text-text-muted">
                No forms to fill out. Just send a message or give us a call.
              </p>
            </div>

          </div>

        </div>

      </div>
    </main>
  );
}
