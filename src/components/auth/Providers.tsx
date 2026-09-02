"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

/**
 * The only thing both sites share.
 *
 * Everything else that used to live here — the sign-in sheet, the saved-rooms
 * store — belongs to the room site and is mounted in `(main)/layout.tsx`. It
 * was here, in the root layout, which meant a mess owner signing in for the
 * first time was met with the room site's "Almost done" sheet asking for a
 * mobile number so hostel owners could call him back. Wrong product, wrong
 * promise, and the worst possible first minute.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
