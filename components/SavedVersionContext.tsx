"use client";
import { createContext, useContext } from "react";

export type SavedVersion = {
  name: string | null;
  savedAt: string;
  tokenId: string;
  versionId: string;
  canModify: boolean;
};

// Set only by the saved-version viewer; editor surfaces that shouldn't appear
// on a read-only snapshot check it to opt out.
export const SavedVersionContext = createContext<SavedVersion | null>(null);
export const useIsVersion = () => useContext(SavedVersionContext);
