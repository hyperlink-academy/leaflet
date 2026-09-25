import { create } from "zustand";

type FindReplaceState = {
  open: boolean;
  query: string;
  replacement: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  focusSeq: number;
};

export const useFindReplaceStore = create<FindReplaceState>(() => ({
  open: false,
  query: "",
  replacement: "",
  caseSensitive: false,
  wholeWord: false,
  focusSeq: 0,
}));

export const searchOptions = (s: {
  caseSensitive: boolean;
  wholeWord: boolean;
}) => ({
  caseSensitive: s.caseSensitive,
  wholeWord: s.wholeWord,
});

export const openFindReplace = (seedQuery?: string) =>
  useFindReplaceStore.setState((s) => ({
    open: true,
    query: seedQuery || s.query,
    focusSeq: s.focusSeq + 1,
  }));

export const closeFindReplace = () =>
  useFindReplaceStore.setState({ open: false });
