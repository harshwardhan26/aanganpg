'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export function MobileFilterSheet({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();

  // Close the sheet automatically when search parameters change (i.e. form submitted)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [searchParams]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={
        <Button 
          variant="outline" 
          className="lg:hidden fixed bottom-6 right-6 z-40 rounded-full shadow-lg h-14 px-6 bg-primary-strong text-white border-none hover:bg-primary-hover"
        />
      }>
        <Filter className="mr-2 h-5 w-5" />
        Filters
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl px-4 py-6 overflow-hidden flex flex-col bg-white">
        <SheetTitle className="sr-only">Filters</SheetTitle>
        <div className="flex-1 overflow-y-auto pb-20 relative">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
