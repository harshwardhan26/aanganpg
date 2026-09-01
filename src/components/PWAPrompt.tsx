"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "./ui/button";

// Extend Window interface for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Asked once, ever.
 *
 * `beforeinstallprompt` fires on every page load, and only the ✕ used to record
 * anything — so a student who installed, or who said No to Chrome's own dialog,
 * or who simply scrolled past, got the same bar again on the next page, and the
 * next. Declining Chrome's dialog was worse still: the outcome was `dismissed`,
 * which the old code ignored, so the bar stayed on screen after the student had
 * already said no.
 *
 * The flag is written when the bar is SHOWN, not when it is answered. Every way
 * out of it — installed, declined, ✕, or navigated away without looking — is
 * then a way that does not ask again, which is what "once" has to mean. Asking a
 * second time is worth less than a person's patience with us.
 */
const ASKED_KEY = 'pwa-prompt-dismissed';

/** localStorage throws outright in Safari private mode, so neither call may. */
function alreadyAsked(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === 'true';
  } catch {
    // No storage means no memory of asking. Better to stay quiet than to nag a
    // student every page for the life of the session.
    return true;
  }
}

function markAsked() {
  try {
    localStorage.setItem(ASKED_KEY, 'true');
  } catch {
    // Nothing to recover from — the bar is already hidden for this session.
  }
}

export function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker registration failed:', err);
      });
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();

      if (alreadyAsked()) return;

      // Recorded here, at the moment it goes on screen. Recording it in the
      // handlers below instead is what let every path except the ✕ come back.
      markAsked();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    // Whatever they chose, the bar has done its job. `accepted` only used to
    // close it, so saying No to Chrome left our bar sitting there underneath.
    await deferredPrompt.userChoice;

    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-border shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-300">
      <div>
        <h3 className="font-semibold text-text-main">Add Aangan to your Home Screen</h3>
        <p className="text-sm text-text-muted mt-1">Get quick access to your rooms and saved searches without opening the browser.</p>
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <Button onClick={handleInstall} className="flex-1 sm:flex-none gap-2 bg-primary-strong text-white hover:bg-primary-hover">
          <Download className="h-4 w-4" />
          Install App
        </Button>
        <Button onClick={handleDismiss} variant="ghost" size="icon" className="shrink-0 text-text-muted hover:bg-slate-100">
          <X className="h-5 w-5" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </div>
  );
}
