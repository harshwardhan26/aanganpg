import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Aangan Kolhapur",
  description: "Terms of Service for Aangan Rooms",
  alternates: {
    canonical: "/terms"
  }
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white py-12 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 font-heading tracking-tight">
          Terms of Service
        </h1>
        
        <div className="space-y-6 text-slate-600 leading-relaxed">
          <p className="font-medium text-slate-500">Last updated: August 2026</p>
          
          <p>Welcome to Aangan Rooms. By accessing our website, you agree to be bound by these Terms of Service.</p>
          
          <h2 className="text-xl font-bold text-slate-800 pt-4">1. Acceptance of Terms</h2>
          <p>By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.</p>
          
          <h2 className="text-xl font-bold text-slate-800 pt-4">2. Description of Service</h2>
          <p>Aangan Rooms provides an online platform to discover and verify student accommodations in Kolhapur.</p>
          
          <h2 className="text-xl font-bold text-slate-800 pt-4">3. User Responsibilities</h2>
          <p>Users are responsible for verifying the details of any accommodation before making a financial commitment. Aangan Rooms acts as a discovery platform and is not a party to any rental agreements.</p>
          
          <h2 className="text-xl font-bold text-slate-800 pt-4">4. Content and Accuracy</h2>
          <p>While we physically verify properties and take our own photographs, we do not guarantee that the property will perfectly match at the time of your visit. Availability and prices change frequently.</p>
          
          <h2 className="text-xl font-bold text-slate-800 pt-4">5. Contact</h2>
          <p>If you have any questions about these Terms, please <Link href="/about" className="text-primary-strong hover:underline">contact us</Link>.</p>
        </div>
      </div>
    </main>
  );
}
