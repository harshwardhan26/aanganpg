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
      
      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (dismissed !== 'true') {
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', 'true');
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
