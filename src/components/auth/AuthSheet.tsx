"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { auth } from "@/lib/firebase-client";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { canonicalPhone } from "@/lib/phone";

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
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep("phone");
      setPhone("");
      setCode("");
      setError("");
    }
  }, [open]);

  // Recaptcha initialization is moved to the div ref

  const handleSendCode = async () => {
    setError("");
    setLoading(true);
    try {
      const canonical = canonicalPhone(phone);
      if (!canonical) throw new Error("Please enter a valid 10-digit mobile number.");
      
      const rlRes = await fetch("/api/auth/otp/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: canonical })
      });
      
      if (!rlRes.ok) {
         if (rlRes.status === 429) throw new Error("Too many requests. Please try again later.");
         throw new Error("Unable to send OTP.");
      }

      const confirmation = await signInWithPhoneNumber(auth, canonical, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setStep("code");
    } catch (e: unknown) {
      console.error(e);
      setError((e as Error).message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      if (!confirmationResult) throw new Error("No confirmation result");
      const result = await confirmationResult.confirm(code);
      const idToken = await result.user.getIdToken();
      
      const res = await signIn("credentials", {
        idToken,
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
      <SheetContent side="bottom" className="h-[auto] max-h-[90vh] rounded-t-xl px-6 py-8 bg-white flex flex-col gap-6" showCloseButton={false}>
        <SheetTitle className="text-2xl font-bold font-heading text-text-main">
          {step === "phone" ? "Log in to save rooms" : "Enter verification code"}
        </SheetTitle>
        
        {step === "phone" ? (
          <div className="space-y-4">
            <p className="text-text-muted">Students only. Owners, please contact us directly.</p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-main">Mobile Number</label>
              <div className="flex bg-light border border-border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-strong/20 min-h-12">
                <span className="flex items-center px-4 bg-slate-100 text-text-muted font-medium border-r border-border">+91</span>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                  className="flex-1 bg-transparent px-4 py-3 outline-none"
                  maxLength={10}
                />
              </div>
            </div>
            {error && <p className="text-primary-strong text-sm font-medium">{error}</p>}
            <Button 
              className="w-full bg-primary-strong hover:bg-primary-hover text-white font-bold h-12"
              onClick={handleSendCode}
              disabled={loading || phone.length < 10}
            >
              {loading ? "Sending..." : "Send OTP"}
            </Button>
            <div id="recaptcha-container" ref={(el) => {
              if (el && !window.recaptchaVerifier) {
                window.recaptchaVerifier = new RecaptchaVerifier(auth, el, {
                  size: 'invisible',
                });
              }
            }}></div>
            <button className="min-h-12 px-4 flex items-center justify-center text-sm text-text-muted hover:text-text-main font-medium mx-auto mt-2" onClick={() => onOpenChange(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-text-muted">We sent a 6-digit code to {canonicalPhone(phone)}</p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-main">OTP Code</label>
              <input 
                type="text" 
                value={code} 
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full h-12 bg-light border border-border rounded-lg px-4 outline-none focus:ring-2 focus:ring-primary-strong/20 text-center text-lg tracking-[0.5em] font-medium"
                maxLength={6}
              />
            </div>
            {error && <p className="text-primary-strong text-sm font-medium">{error}</p>}
            <Button 
              className="w-full bg-primary-strong hover:bg-primary-hover text-white font-bold h-12"
              onClick={handleVerify}
              disabled={loading || code.length < 6}
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </Button>
            <button className="min-h-12 px-4 flex items-center justify-center text-sm text-text-muted hover:text-text-main font-medium mx-auto mt-2" onClick={() => setStep("phone")}>
              Change phone number
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Add types for window recaptcha
import { ApplicationVerifier } from "firebase/auth";
declare global {
  interface Window {
    recaptchaVerifier: ApplicationVerifier;
  }
}
