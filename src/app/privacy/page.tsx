import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Aangan Kolhapur",
  description: "Privacy Policy for Aangan Rooms",
  alternates: {
    canonical: "/privacy"
  }
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white py-12 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 font-heading tracking-tight">
          Privacy Policy
        </h1>
        
        <div className="space-y-6 text-slate-600 leading-relaxed">
          <p className="font-medium text-slate-500">Last updated: August 2026</p>
          
          <p>Your privacy is important to us. It is Aangan Rooms&apos; policy to respect your privacy regarding any information we may collect from you across our website.</p>
          
          <h2 className="text-xl font-bold text-slate-800 pt-4">1. Information We Collect</h2>
          <p>We only ask for personal information (such as your mobile number) when we truly need it to provide a service to you, like logging in or saving your favorite rooms.</p>
          
          <h2 className="text-xl font-bold text-slate-800 pt-4">2. How We Use Your Information</h2>
          <p>We use your information to facilitate your experience on the platform, manage your saved rooms, and contact you regarding inquiries. We do not sell your data to third parties.</p>
          
          <h2 className="text-xl font-bold text-slate-800 pt-4">3. Security</h2>
          <p>We use industry-standard security measures, including Firebase Authentication, to protect your personal information. However, no method of transmission over the internet is 100% secure.</p>
          
          <h2 className="text-xl font-bold text-slate-800 pt-4">4. Third-Party Services</h2>
          <p>Our website may link to external sites that are not operated by us. Please be aware that we have no control over the content and practices of these sites, and cannot accept responsibility for their respective privacy policies.</p>
          
          <h2 className="text-xl font-bold text-slate-800 pt-4">5. Contact</h2>
          <p>If you have any questions about how we handle user data and personal information, feel free to <Link href="/about" className="text-primary-strong hover:underline">contact us</Link>.</p>
        </div>
      </div>
    </main>
  );
}
