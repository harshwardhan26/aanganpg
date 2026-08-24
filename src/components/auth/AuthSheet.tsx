"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

import { signIn, useSession } from "next-auth/react";
import { enquiryGate } from "@/lib/session";
import { saveUserProfile } from "@/actions/user";
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
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [onSuccess, setOnSuccess] = useState<(() => void) | null>(null);

  const gate = enquiryGate(status, session?.user?.phone);
  // Google returns the student to the page they left, signed in but with no
  // number on file. Ask for it there and then — waiting until their next tap on
  // Call or WhatsApp means an account we cannot follow up on in the meantime.
  const mustCompleteProfile = gate === "phone";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (mustCompleteProfile) setOpen(true);
  }, [mustCompleteProfile]);

  const openAuthSheet = (callback?: () => void) => {
    setOnSuccess(() => callback || null);
    setOpen(true);
  };

  return (
    <AuthContext.Provider value={{ openAuthSheet }}>
      {children}
      <AuthSheet
        open={open}
        mustCompleteProfile={mustCompleteProfile}
        onOpenChange={(next) => {
          // A half-finished account is the one state worth trapping them in:
          // they chose to sign in, and the number is the whole point.
          if (!next && mustCompleteProfile) return;
          setOpen(next);
        }}
        onSuccess={() => {
          setOpen(false);
          if (onSuccess) onSuccess();
        }}
      />
    </AuthContext.Provider>
  );
}

function GoogleMark() {
  return (
    <svg className="mr-2 h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.8-.4-4H24v7.3h12.1c-.2 2-1.6 5-4.5 7l-.1.3 6.5 5 .5.1c4.1-3.8 6.6-9.4 6.6-15.7"/>
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.7l-.3.1-6.7 5.2-.1.3C7.9 40.9 15.4 46 24 46"/>
      <path fill="#FBBC05" d="M11.5 27.8c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4v-.3l-6.8-5.3-.2.1A22 22 0 0 0 2 23.4c0 3.5.9 6.9 2.5 9.9z"/>
      <path fill="#EA4335" d="M24 9.9c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 3.7 29.9 1 24 1 15.4 1 7.9 6.1 4.5 13.5l6.9 5.4C13.3 13.7 18.2 9.9 24 9.9"/>
    </svg>
  );
}

function AuthSheet({
  open,
  mustCompleteProfile,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  mustCompleteProfile: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const googleName = session?.user?.name ?? "";

  useEffect(() => {
    // Google already knows their name. Prefilling it leaves one field to type,
    // and they can still correct it — the name reaches the owner on a callback.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open && mustCompleteProfile) setName((current) => current || googleName);
  }, [open, mustCompleteProfile, googleName]);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhone("");
      setError("");
    }
  }, [open]);

  useEffect(() => {
    // If the user clicks 'Continue with Google', goes to the Google page, 
    // but clicks the browser Back button instead of logging in, the page 
    // is restored from cache and stays stuck on 'Redirecting...'. 
    // This resets the button when the page becomes visible again.
    const handlePageShow = () => setLoading(false);
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const handleGoogle = () => {
    setLoading(true);
    // Google redirects the whole page, so `onSuccess` cannot fire in this load.
    // Coming back to the same URL is what the student expects anyway.
    signIn("google", { callbackUrl: window.location.href });
  };

  const handleSaveProfile = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await saveUserProfile(name, phone);
      if ("error" in result) throw new Error(result.error);
      // Without this the JWT keeps saying "no phone" and the sheet reopens forever.
      await update({ name: result.name, phone: result.phone });
      onSuccess();
    } catch (e: unknown) {
      setError((e as Error).message || "Could not save your details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={!mustCompleteProfile}
        className="h-[auto] max-h-[90dvh] rounded-t-2xl sm:rounded-2xl px-8 pt-8 pb-6 sm:px-8 sm:pt-10 sm:pb-8 bg-white border-none shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col sm:max-w-[420px] sm:mx-auto sm:!fixed sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2"
      >
        {/* Logo */}
        <div className="flex justify-center mb-3">
          <Image src="/logo-dark.png" alt="Aangan" width={160} height={44} className="h-9 w-auto" />
        </div>

        {/* Title */}
        <SheetTitle className="text-xl font-bold font-heading text-slate-900 text-center mb-8">
          {mustCompleteProfile ? "Almost done" : "Sign in or Create account"}
        </SheetTitle>

        {mustCompleteProfile ? (
          <div className="flex flex-col gap-5 pb-2">
            <p className="text-slate-600 text-xs text-center px-4 bg-slate-50 py-2 rounded-md border border-slate-200">
              Owners call back on this number. We share it only with the owner of a room you choose to contact. <br />
              मालक याच नंबरवर संपर्क करतात. तुम्ही संपर्क साधलेल्या रूमच्या मालकासोबतच आम्ही तो शेअर करतो.
            </p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="auth-name" className="text-[13px] font-semibold text-slate-700">
                Your Name <span className="text-primary-strong">*</span>
              </label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Rohan Patil"
                className="w-full h-12 border border-slate-300 rounded-lg px-3.5 outline-none focus:border-primary-strong focus:ring-2 focus:ring-primary-strong/10 text-slate-900 text-sm placeholder-slate-400 transition-all"
                maxLength={60}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="auth-phone" className="text-[13px] font-semibold text-slate-700">
                Mobile Number <span className="text-primary-strong">*</span>
              </label>
              <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:border-primary-strong focus-within:ring-2 focus-within:ring-primary-strong/10 transition-all h-12">
                <span className="flex items-center px-3.5 text-slate-700 font-semibold border-r border-slate-300 text-sm bg-slate-50">+91</span>
                <input
                  id="auth-phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 9876543210"
                  className="flex-1 bg-white px-3.5 outline-none text-slate-900 text-sm placeholder-slate-400"
                  maxLength={10}
                />
              </div>
            </div>

            {error && <p className="text-primary-strong text-xs font-semibold text-center -mt-1">{error}</p>}

            <Button
              type="button"
              className="w-full bg-primary-strong text-white hover:bg-primary-hover font-semibold"
              onClick={handleSaveProfile}
              disabled={loading || phone.length < 10 || name.trim().length < 2}
            >
              {loading ? "Saving..." : "Save & Continue"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-5 pb-2">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 border-slate-300 bg-white text-slate-800 hover:bg-slate-50 font-semibold"
              onClick={handleGoogle}
              disabled={loading}
            >
              <GoogleMark />
              {loading ? "Redirecting..." : "Continue with Google"}
            </Button>

            {error && <p className="text-primary-strong text-xs font-semibold text-center -mt-1">{error}</p>}

            {/* Terms */}
            <p className="text-[11px] text-center text-slate-400 leading-relaxed mt-2 mb-1">
              By continuing, you agree to Aangan&apos;s{' '}
              <Link href="/terms" className="text-primary-strong hover:underline" onClick={() => onOpenChange(false)}>Terms of Service</Link>
              {' '}&amp;{' '}
              <Link href="/privacy" className="text-primary-strong hover:underline" onClick={() => onOpenChange(false)}>Privacy Policy</Link>.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
