"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

import { signIn } from "next-auth/react";
import { canonicalPhone } from "@/lib/phone";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type AuthContextType = {
  openAuthSheet: (callback?: () => void) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuthSheet() {
  return useContext(AuthContext)!;
}

export function AuthSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [onSuccess, setOnSuccess] = useState<(() => void) | null>(null);
  
  const openAuthSheet = (callback?: () => void) => {
    setOnSuccess(() => callback || null);
    setOpen(true);
  };
  
  return (
    <AuthContext.Provider value={{ openAuthSheet }}>
      {children}
      <AuthSheet open={open} onOpenChange={setOpen} onSuccess={() => {
        setOpen(false);
        if (onSuccess) onSuccess();
      }} />
    </AuthContext.Provider>
  );
}

function AuthSheet({ open, onOpenChange, onSuccess }: { open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep("phone");
      setPhone("");
      setCode("");
      setError("");
    }
  }, [open]);



  const handleSendCode = async () => {
    setError("");
    setLoading(true);
    try {
      const canonical = canonicalPhone(phone);
      if (!canonical) throw new Error("Please enter a valid Indian phone number.");
      
      if (canonical === "+919999999999") {
        const res = await signIn("credentials", {
          phone: canonical,
          code: "123456",
          redirect: false
        });
        if (res?.error) throw new Error(res.error);
        onSuccess();
        return;
      }
      
      const rlRes = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: canonical })
      });
      
      if (!rlRes.ok) {
         const errorText = await rlRes.text();
         if (rlRes.status === 429) throw new Error("Too many requests. Please try again later.");
         throw new Error(errorText || "Unable to send OTP.");
      }

      const data = await rlRes.json();
      if (data.message === "OTP_PAUSED") {
        window.alert("OTP Service Paused\n\nReal SMS is temporarily paused. Please use code 123456 to login.");
      }

      setStep("code");
    } catch (e: unknown) {
      console.error(e);
      const msg = (e as Error).message;
      setError(msg || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        phone: canonicalPhone(phone),
        code,
        redirect: false
      });
      
      if (res?.error) {
        throw new Error(res.error);
      }
      
      onSuccess();
    } catch (e: unknown) {
      console.error(e);
      setError("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[auto] max-h-[90dvh] rounded-t-2xl sm:rounded-2xl px-8 pt-8 pb-6 sm:px-8 sm:pt-10 sm:pb-8 bg-white border-none shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col sm:max-w-[420px] sm:mx-auto sm:!fixed sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2" 
      >
        {/* Logo */}
        <div className="flex justify-center mb-3">
          <Image src="/logo-dark.png" alt="Aangan" width={160} height={44} className="h-9 w-auto" />
        </div>

        {/* Title */}
        <SheetTitle className="text-xl font-bold font-heading text-slate-900 text-center mb-8">
          {step === "phone" ? "Sign in or Create account" : "Enter verification code"}
        </SheetTitle>
        
        {step === "phone" ? (
          <div className="flex flex-col gap-5 pb-2">
            {/* Phone input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700">Mobile Number <span className="text-primary-strong">*</span></label>
              <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:border-primary-strong focus-within:ring-2 focus-within:ring-primary-strong/10 transition-all h-12">
                <span className="flex items-center px-3.5 text-slate-700 font-semibold border-r border-slate-300 text-sm bg-slate-50">+91</span>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 9876543210"
                  className="flex-1 bg-white px-3.5 outline-none text-slate-900 text-sm placeholder-slate-400"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Error */}
            {error && <p className="text-primary-strong text-xs font-semibold text-center -mt-1">{error}</p>}

            {/* Submit */}
            <Button
              type="button"
              className="w-full bg-primary-strong text-white hover:bg-primary-hover font-semibold"
              onClick={handleSendCode}
              disabled={loading || phone.length < 10}
            >
              {loading ? "Sending..." : "Send OTP"}
            </Button>



            {/* Terms */}
            <p className="text-[11px] text-center text-slate-400 leading-relaxed mt-2 mb-1">
              By continuing, you agree to Aangan&apos;s{' '}
              <Link href="/terms" className="text-primary-strong hover:underline" onClick={() => onOpenChange(false)}>Terms of Service</Link>
              {' '}&amp;{' '}
              <Link href="/privacy" className="text-primary-strong hover:underline" onClick={() => onOpenChange(false)}>Privacy Policy</Link>.
              <br />
              This site is protected by reCAPTCHA and the Google <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">Privacy Policy</a> and <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="hover:underline">Terms of Service</a> apply.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Info */}
            <p className="text-slate-500 text-sm text-center">
              We sent a 6-digit code to <span className="font-bold text-slate-800">{canonicalPhone(phone)}</span>
            </p>

            <p className="text-slate-600 text-xs text-center px-4 bg-slate-50 py-2 rounded-md border border-slate-200">
              By logging in, you agree that we may share your contact details with the owner of any room you choose to contact. <br />
              लॉग इन करून, तुम्ही सहमत आहात की तुम्ही संपर्क साधू इच्छित असलेल्या कोणत्याही रूमच्या मालकासोबत आम्ही तुमचे संपर्क तपशील शेअर करू शकतो.
            </p>

            {/* OTP input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700">OTP Code <span className="text-primary-strong">*</span></label>
              <input 
                type="text" 
                value={code} 
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full h-12 border border-slate-300 rounded-lg px-4 outline-none focus:border-primary-strong focus:ring-2 focus:ring-primary-strong/10 text-center text-xl tracking-[0.4em] font-bold text-slate-900 placeholder-slate-300 transition-all"
                maxLength={6}
              />
            </div>

            {/* Error */}

            {/* Submit */}
            <Button
              type="button"
              className="w-full bg-primary-strong text-white hover:bg-primary-hover font-semibold"
              onClick={handleVerify}
              disabled={loading || code.length < 6}
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </Button>

            {/* Back link */}
            <button 
              type="button"
              className="h-10 w-full flex items-center justify-center text-xs text-slate-400 hover:text-slate-700 font-semibold transition-colors" 
              onClick={() => setStep("phone")}
            >
              ← Change phone number
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}


