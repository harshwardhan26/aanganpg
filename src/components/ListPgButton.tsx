'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useAuthSheet } from '@/components/auth/AuthSheet';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

interface ListPgButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children?: React.ReactNode;
}

export function ListPgButton({ className, variant = "outline", size = "default", children }: ListPgButtonProps) {
  const { status } = useSession();
  const { openAuthSheet } = useAuthSheet();

  return (
    <Link 
      href="/list-your-pg" 
      onClick={(e) => {
        if (status !== 'authenticated') {
          e.preventDefault();
          openAuthSheet();
        }
      }}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {children || 'List Property \u2014 FREE'}
    </Link>
  );
}
