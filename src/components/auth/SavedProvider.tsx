"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useSession } from "next-auth/react";

type SavedContextType = {
  savedIds: Set<string>;
  toggleSavedLocal: (propertyId: string, isSaving: boolean) => void;
  isLoading: boolean;
};

const SavedContext = createContext<SavedContextType | null>(null);

export function useSaved() {
  return useContext(SavedContext)!;
}

export function SavedProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSavedIds(new Set());
      setIsLoading(false);
      return;
    }

    if (status === "authenticated") {
      setIsLoading(true);
      fetch("/api/user/saved-ids")
        .then(res => res.json())
        .then(data => {
          setSavedIds(new Set(data.ids || []));
        })
        .finally(() => setIsLoading(false));
    }
  }, [status]);

  const toggleSavedLocal = useCallback((propertyId: string, isSaving: boolean) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (isSaving) next.add(propertyId);
      else next.delete(propertyId);
      return next;
    });
  }, []);

  return (
    <SavedContext.Provider value={{ savedIds, toggleSavedLocal, isLoading }}>
      {children}
    </SavedContext.Provider>
  );
}
