import { createContext, useContext } from "react";
import type { FootnoteInfo } from "./usePageFootnotes";

type FootnoteContextValue = {
  pageID: string;
  footnotes: FootnoteInfo[];
  indexMap: Record<string, number>;
};

export const FootnoteContext = createContext<FootnoteContextValue>({
  pageID: "",
  footnotes: [],
  indexMap: {},
});

export function useFootnoteContext() {
  return useContext(FootnoteContext);
}
