'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAuthSheet } from '@/components/auth/AuthSheet';
import { recordEnquiry } from '@/actions/enquiries';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Phone, MessageCircle } from 'lucide-react';
import { telLink, whatsappLink } from '@/lib/whatsapp';
import { getAanganPhone } from '@/lib/contact';

import { trackEvent } from '@/lib/posthog';

interface EnquiryActionsProps {
  propertyId: string;
  title: string;
  /** "₹5,000/month" — carried into the WhatsApp text so we see which room. */
  displayPrice?: string | null;
  location?: string | null;
  /** Absolute listing URL, built on the server. Needed in the WhatsApp text at
      render time, and reading `window.location` during render is a hydration
      mismatch waiting to happen. */
  listingUrl?: string | null;
  variant?: 'full' | 'primary-only' | 'secondary-only';
}

/**
 * Every contact route on a listing goes to Aangan, never to the owner.
 *
 * The owner's number is stored on the listing and is required to publish, but a
 * student never sees it: a student who calls the owner direct and closes the
 * deal in the doorway is a deal Aangan never knew happened.
 */
export function EnquiryActions({ propertyId, title, displayPrice, location, listingUrl, variant = 'full' }: EnquiryActionsProps) {
  const { status } = useSession();
  const { openAuthSheet } = useAuthSheet();
  const aanganPhone = getAanganPhone();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [statusState, setStatusState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleCall = (e: React.MouseEvent) => {
    if (status !== 'authenticated') {
      e.preventDefault();
      openAuthSheet();
      return;
    }
    trackEvent('pg_contact_clicked', { channel: 'call', propertyId });
    recordEnquiry({ propertyId, channel: 'call' });
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    if (status !== 'authenticated') {
      e.preventDefault();
      openAuthSheet();
      return;
    }
    trackEvent('pg_contact_clicked', { channel: 'whatsapp', propertyId });
    recordEnquiry({ propertyId, channel: 'whatsapp' });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status !== 'authenticated') {
      openAuthSheet();
      return;
    }
    setStatusState('loading');
    setErrorMessage('');
    
    const result = await recordEnquiry({
      propertyId,
      channel: 'form',
      name,
      phone
    });

    if (result?.error) {
      setErrorMessage(result.error);
      setStatusState('error');
    } else {
      trackEvent('lead_submitted', { propertyId });
      setStatusState('success');
    }
  };

  return (
    <div className="space-y-4">
      {variant !== 'secondary-only' && (
        <div className="grid grid-cols-2 gap-3">
        <a 
          href={telLink(aanganPhone) || '#'}
          className={cn(buttonVariants({ variant: 'outline' }), "w-full text-text-main border-border h-12")}
          onClick={handleCall}
        >
          <Phone className="mr-2 h-5 w-5" />
          Call Aangan
        </a>
        <a
          href={
            whatsappLink(
              aanganPhone,
              [
                `I want to see this room — "${title}"${displayPrice ? `, ${displayPrice}` : ''}`,
                listingUrl,
              ]
                .filter(Boolean)
                .join('\n'),
            ) || '#'
          }
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants(), "w-full bg-whatsapp hover:bg-[#1da851] text-whatsapp-dark h-12")}
          onClick={handleWhatsApp}
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          WhatsApp
        </a>
      </div>
      )}

      {variant !== 'primary-only' && (
        <>
          <div className={cn("flex items-center justify-between", variant === 'full' && "pt-2 border-t border-border")}>
            <button
          type="button"
          onClick={(e) => {
            if (status !== 'authenticated') {
              e.preventDefault();
              openAuthSheet();
              return;
            }
            setIsFormOpen(!isFormOpen);
          }}
          className="text-sm text-text-muted hover:text-text-main underline-offset-4 hover:underline min-h-[44px] py-2 px-1 -ml-1"
        >
          Prefer a callback? Leave your number
        </button>

        <button
          type="button"
          onClick={() => {
            trackEvent('room_shared', { propertyId });
            recordEnquiry({ propertyId, channel: 'share' });
            const text = [title, [displayPrice, location].filter(Boolean).join(' · '), window.location.href]
              .filter(Boolean)
              .join('\n');
            if (navigator.share) {
              navigator.share({ title, text, url: window.location.href }).catch(() => {});
            } else {
              navigator.clipboard.writeText(text);
            }
          }}
          className="text-sm text-text-muted hover:text-text-main flex items-center gap-1 min-h-12 px-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
          Share
        </button>
      </div>
        
      {isFormOpen && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3 p-4 bg-light rounded-xl border border-border">
            <h3 className="font-semibold text-text-main mb-3">Ask Aangan</h3>
            
            {statusState === 'success' ? (
              <div className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">
                Thanks! We will check with the owner and call you back shortly.
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <Input
                    required
                    placeholder="Your Name"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Input
                    required
                    type="tel"
                    placeholder="Mobile Number"
                    value={phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                    className="bg-white"
                  />
                </div>
                {statusState === 'error' && (
                  <p className="text-sm text-red-600">{errorMessage}</p>
                )}
                <Button 
                  type="submit" 
                  disabled={statusState === 'loading'}
                  className="w-full bg-primary-strong text-white hover:bg-primary-hover"
                >
                  {statusState === 'loading' ? 'Sending...' : 'Send Enquiry'}
                </Button>
              </>
            )}
          </form>
        )}
      </>
      )}
    </div>
  );
}
