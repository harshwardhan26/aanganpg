"use client";

import { ReactNode } from "react";
import { AuthSheetProvider } from "./AuthSheet";
import { SavedProvider } from "./SavedProvider";

/**
 * The room site's client state: the sign-in sheet and the saved-rooms hearts.
 *
 * Scoped to `(main)` on purpose. Both ask the signed-in person for something
 * only the room site wants — a phone number for owners to call back, and a list
 * of saved hostels — and neither has any meaning on mess.aanganpg.com.
 */
export function RoomProviders({ children }: { children: ReactNode }) {
  return (
    <AuthSheetProvider>
      <SavedProvider>{children}</SavedProvider>
    </AuthSheetProvider>
  );
}
