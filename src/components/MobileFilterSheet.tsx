'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export function MobileFilterSheet({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();

  // Close the sheet automatically when search parameters change (i.e. form submitted)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [searchParams]);

  let activeCount = 0;
  for (const [key, value] of Array.from(searchParams.entries())) {
    if (key !== 'sort' && value) activeCount++;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={
        <Button 
          variant="outline" 
          className="lg:hidden fixed bottom-6 right-6 z-40 rounded-full shadow-lg h-14 px-6 bg-primary-strong text-white border-none hover:bg-primary-hover"
        />
      }>
        <Filter className="mr-2 h-5 w-5" />
        Filters {activeCount > 0 ? `· ${activeCount}` : ''}
      </SheetTrigger>
      {/* The height needs the `data-[side=bottom]:` prefix to land. The base
          component ships `data-[side=bottom]:h-auto`, which outranks a plain
          `h-[85dvh]` on specificity — so the sheet grew to its full content
          height, anchored to the bottom, and ran its header and first four
          filters off the top of the screen. It looked like it opened scrolled
          to the bottom. */}
      <SheetContent side="bottom" showCloseButton={false} className="data-[side=bottom]:h-[85dvh] rounded-t-2xl px-0 pt-0 pb-0 bg-white border-none shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col">
        {/* A real header, and the close button is the first focusable thing in
            here. Without it the sheet opened scrolled to the very bottom — the
            student's first sight of "Filters" was the house-rules checkboxes. */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <SheetTitle className="font-heading text-lg font-bold text-text-main">Filters</SheetTitle>
          <SheetClose className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-text-muted hover:text-text-main">
            <X className="h-5 w-5" />
            <span className="sr-only">Close filters</span>
          </SheetClose>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
