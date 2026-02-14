import { create } from "zustand";
import type {
  NormalizedDocument,
  NormalizedPublication,
} from "src/utils/normalizeRecords";

export type SelectedPostListing = {
  document_uri: string;
  document: NormalizedDocument;
  publication?: NormalizedPublication;
  drawer: "quotes" | "comments";
};

export const useSelectedPostListing = create<{
  selectedPostListing: SelectedPostListing | null;
  setSelectedPostListing: (post: SelectedPostListing | null) => void;
}>((set) => ({
  selectedPostListing: null,
  setSelectedPostListing: (post) => set({ selectedPostListing: post }),
}));
