'use client';

import { useState } from 'react';
import { recordEnquiry } from '@/actions/enquiries';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Phone, MessageCircle } from 'lucide-react';
import { telLink, whatsappLink } from '@/lib/whatsapp';

import { trackEvent } from '@/lib/posthog';

interface EnquiryActionsProps {
  propertyId: string;
  ownerPhone: string;
  title: string;
  /** "₹5,000/month" — carried into the WhatsApp text so the owner sees which room. */
  displayPrice?: string | null;
  ownerName?: string | null;
  location?: string | null;
  variant?: 'full' | 'primary-only' | 'secondary-only';
}

export function EnquiryActions({ propertyId, ownerPhone, title, displayPrice, ownerName, location, variant = 'full' }: EnquiryActionsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleCall = () => {
    trackEvent('pg_contact_clicked', { channel: 'call', propertyId });
    recordEnquiry({ propertyId, channel: 'call' });
  };

  const handleWhatsApp = () => {
    trackEvent('pg_contact_clicked', { channel: 'whatsapp', propertyId });
    recordEnquiry({ propertyId, channel: 'whatsapp' });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');
    
    const result = await recordEnquiry({
      propertyId,
      channel: 'form',
      name,
      phone
    });

    if (result?.error) {
      setErrorMessage(result.error);
      setStatus('error');
    } else {
      trackEvent('lead_submitted', { propertyId });
      setStatus('success');
    }
  };

  return (
    <div className="space-y-4">
      {variant !== 'secondary-only' && (
        <div className="grid grid-cols-2 gap-3">
        <a 
          href={telLink(ownerPhone) || '#'}
          className={cn(buttonVariants({ variant: 'outline' }), "w-full text-text-main border-border h-12")}
          onClick={handleCall}
        >
          <Phone className="mr-2 h-5 w-5" />
          Call Owner
        </a>
        <a
          href={
            whatsappLink(
              ownerPhone,
              `नमस्कार${ownerName ? ` ${ownerName}` : ''}, Aangan वर तुमची रूम बघितली — "${title}"${displayPrice ? `, ${displayPrice}` : ''}. अजून जागा आहे का?`,
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
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="text-sm text-text-muted hover:text-text-main underline-offset-4 hover:underline min-h-[44px] py-2 px-1 -ml-1"
        >
          Owner not picking up? Ask Aangan instead
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
            
            {status === 'success' ? (
              <div className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">
                Thanks! We will check with the owner and get back to you shortly.
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
                {status === 'error' && (
                  <p className="text-sm text-red-600">{errorMessage}</p>
                )}
                <Button 
                  type="submit" 
                  disabled={status === 'loading'}
                  className="w-full bg-primary-strong text-white hover:bg-primary-hover"
                >
                  {status === 'loading' ? 'Sending...' : 'Send Enquiry'}
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
