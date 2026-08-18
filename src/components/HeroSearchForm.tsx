'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

export function HeroSearchForm({ colleges }: { colleges: { slug: string, name: string }[] }) {
  const [error, setError] = useState(false);

  return (
    <form 
      action="/search" 
      method="get" 
      className="bg-white p-2 rounded-2xl shadow-md border border-border flex flex-col sm:flex-row gap-2 max-w-xl"
      onSubmit={(e) => {
        const formData = new FormData(e.currentTarget);
        if (!formData.get('college')) {
          e.preventDefault();
          setError(true);
        }
      }}
      noValidate
    >
      <div className="flex-1 border-b sm:border-b-0 sm:border-r border-border flex flex-col justify-center relative">
        <label htmlFor="college" className="absolute top-2 left-4 text-[10px] font-semibold text-text-muted uppercase tracking-wider pointer-events-none z-10">Select College</label>
        <select 
          id="college" 
          name="college" 
          defaultValue=""
          onChange={() => setError(false)}
          className="w-full h-14 bg-transparent text-text-main font-medium focus:outline-none appearance-none cursor-pointer pt-5 pb-1 pl-4 pr-12"
        >
          <option value="" disabled>Choose your college...</option>
          {colleges.map(c => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
        {error && <span className="absolute -bottom-6 left-4 text-xs text-primary-strong font-medium">Please select a college.</span>}
      </div>
      <Button type="submit" size="lg" className="w-full sm:w-auto bg-primary-strong text-white hover:bg-primary-hover rounded-lg font-medium shrink-0 sm:self-center">
        Find rooms
      </Button>
    </form>
  );
}
