"use client";

import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useAuthSheet } from "@/components/auth/AuthSheet";
import { useSaved } from "@/components/auth/SavedProvider";
import { toggleSavedProperty } from "@/actions/saved";
import { cn } from "@/lib/utils";

type SaveButtonProps = {
  propertyId: string;
  initialSaved?: boolean;
  className?: string;
  size?: "sm" | "default";
};

export function SaveButton({ propertyId, initialSaved = false, className, size = "sm" }: SaveButtonProps) {
  const { data: session, status } = useSession();
  const { openAuthSheet } = useAuthSheet();
  const { savedIds, toggleSavedLocal } = useSaved();
  
  // Use context if available, otherwise fallback to initial
  const isSaved = savedIds.has(propertyId) || initialSaved;

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent Link navigation if inside a Link
    e.stopPropagation();

    if (status === "unauthenticated" || !session) {
      openAuthSheet(() => {
        // Callback after successful login
        performSave(true);
      });
      return;
    }

    performSave(!isSaved);
  };

  const performSave = async (newSavedState: boolean) => {
    toggleSavedLocal(propertyId, newSavedState);
    try {
      await toggleSavedProperty(propertyId, newSavedState);
    } catch {
      // Revert on error
      toggleSavedLocal(propertyId, !newSavedState);
    }
  };

  const isLg = size === "default";

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "flex items-center justify-center rounded-full transition-colors",
        isLg ? "w-12 h-12 bg-white shadow-md border border-border" : "w-12 h-12 bg-black/30 hover:bg-black/50 backdrop-blur-md",
        className
      )}
      aria-label={isSaved ? "Unsave room" : "Save room"}
    >
      <Heart 
        className={cn(
          isLg ? "w-6 h-6" : "w-4 h-4",
          isSaved ? "fill-primary-strong text-primary-strong" : (isLg ? "text-text-main" : "text-white")
        )} 
      />
    </button>
  );
}
