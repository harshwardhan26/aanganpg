import { Metadata } from "next";

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
          
          <h2 className="text-xl font-bold text-slate-800 pt-4">What we collect and why</h2>
          <p>We collect your name and phone number when you sign in. We also record which listings you contact. This allows us to provide our service and ensure that property owners know who is contacting them.</p>
          
          <h2 className="text-xl font-bold text-slate-800 pt-4">Sharing with owners</h2>
          <p>When you contact a listing (via Call or WhatsApp), we share your name and verified phone number with the owner of that specific listing so they can communicate with you directly. This is the core function of Aangan.</p>
          
          <h2 className="text-xl font-bold text-slate-800 pt-4">How long we keep your data</h2>
          <p>We retain your contact information and contact history as long as your account is active, so you can continue using the platform. We do not sell your data to any third-party marketers.</p>
          
          <h2 className="text-xl font-bold text-slate-800 pt-4">Your rights (Consent & Deletion)</h2>
          <p>You can withdraw your consent at any time. If you wish to withdraw consent or request the complete deletion of your data and account, please email our Grievance Officer at <a href="mailto:grievance@aangan.com" className="text-primary-strong hover:underline">grievance@aangan.com</a>. We will process your deletion request within 15 days.</p>
        </div>
      </div>
    </main>
  );
}
