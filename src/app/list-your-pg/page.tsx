import { Metadata } from "next";
import { getAanganPhone, formatAanganPhoneForDisplay } from "@/lib/contact";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, CheckCircle2, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "List Your PG or Room | Aangan Kolhapur",
  description: "List your Kolhapur PG or hostel on Aangan. Free photographs and free listing this season. Students contact you directly.",
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
            <p className="text-xl text-text-muted max-w-2xl leading-relaxed">
              We photograph your rooms, put them in front of students, and bring the serious ones to you.
            </p>
          </div>

          <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-border space-y-10">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* What we do */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-text-main flex items-center gap-3 font-heading">
                  <div className="flex h-10 w-10 bg-green-100 text-green-700 rounded-full items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  How it works
                </h3>
                <ul className="space-y-4 text-text-muted">
                  <li className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-light flex items-center justify-center shrink-0 mt-0.5 border border-border text-text-main text-xs font-semibold">1</span>
                    <span>Free photographs and free listing <strong className="text-text-main">this season</strong>. We plan to charge later with prior notice.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-light flex items-center justify-center shrink-0 mt-0.5 border border-border text-text-main text-xs font-semibold">2</span>
                    <span><strong className="text-text-main">No money changes hands through Aangan.</strong> Rent, deposit and every rupee go directly from the student to you.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-light flex items-center justify-center shrink-0 mt-0.5 border border-border text-text-main text-xs font-semibold">3</span>
                    <span><strong className="text-text-main">The student contacts you directly.</strong> There is no middleman and no appointment through Aangan.</span>
                  </li>
                </ul>
              </div>

              {/* What we ask */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-text-main flex items-center gap-3 font-heading">
                  <div className="flex h-10 w-10 bg-amber-100 text-amber-700 rounded-full items-center justify-center shrink-0">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  What to expect
                </h3>
                <ul className="space-y-4 text-text-muted">
                  <li className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0 mt-2"></div>
                    <span>A photo visit takes <strong className="text-text-main">about twenty minutes</strong>. We come in person.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0 mt-2"></div>
                    <span>You are in control. You can remove your listing with <strong className="text-text-main">one phone call</strong> and it comes down.</span>
                  </li>
                </ul>
              </div>
            </div>

            <hr className="border-border" />

            <div className="space-y-8 pb-2">
              <h2 className="text-2xl font-bold text-text-main text-center sm:text-left font-heading">
                Ready to list? Contact us directly.
              </h2>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button nativeButton={false} render={<a href={waLink} target="_blank" rel="noopener noreferrer" />} className="flex-1 bg-whatsapp hover:bg-[#1DA851] text-whatsapp-dark font-bold transition-transform hover:-translate-y-0.5">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Message on WhatsApp
                </Button>
                <Button nativeButton={false} render={<a href={`tel:${phone}`} />} className="flex-1 bg-primary-strong hover:bg-primary-hover text-white font-bold transition-transform hover:-translate-y-0.5">
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
