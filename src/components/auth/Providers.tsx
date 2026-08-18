"use client";

import { SessionProvider } from "next-auth/react";
import { AuthSheetProvider } from "./AuthSheet";
import { SavedProvider } from "./SavedProvider";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthSheetProvider>
        <SavedProvider>
          {children}
        </SavedProvider>
      </AuthSheetProvider>
    </SessionProvider>
  );
}
