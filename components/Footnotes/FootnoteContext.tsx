import { createContext, useContext } from "react";
import type { FootnoteInfo } from "./usePageFootnotes";

type FootnoteContextValue = {
  footnotes: FootnoteInfo[];
  indexMap: Record<string, number>;
};

export const FootnoteContext = createContext<FootnoteContextValue>({
  footnotes: [],
  indexMap: {},
});

export function useFootnoteContext() {
  return useContext(FootnoteContext);
}
