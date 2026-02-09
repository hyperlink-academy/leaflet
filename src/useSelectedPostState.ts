import { create } from "zustand";
import type { NormalizedDocument } from "src/utils/normalizeRecords";

export type SelectedPostListing = {
  document_uri: string;
  document: NormalizedDocument;
  drawer: "quotes" | "comments";
};

export const useSelectedPostListing = create<{
  selectedPostListing: SelectedPostListing | null;
  setSelectedPostListing: (post: SelectedPostListing | null) => void;
}>((set) => ({
  selectedPostListing: null,
  setSelectedPostListing: (post) => set({ selectedPostListing: post }),
}));
