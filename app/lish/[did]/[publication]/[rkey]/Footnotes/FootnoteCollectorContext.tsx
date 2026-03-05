"use client";

import { createContext, useContext, useRef, useCallback, useMemo } from "react";
import { PubLeafletRichtextFacet } from "lexicons/api";

export type CollectedFootnote = {
  footnoteId: string;
  index: number;
  contentPlaintext: string;
  contentFacets?: PubLeafletRichtextFacet.Main[];
};

type FootnoteCollectorContextValue = {
  registerFootnote: (footnote: Omit<CollectedFootnote, "index">) => number;
  getFootnotes: () => CollectedFootnote[];
};

const FootnoteCollectorContext = createContext<FootnoteCollectorContextValue>({
  registerFootnote: () => 0,
  getFootnotes: () => [],
});

export function useFootnoteCollector() {
  return useContext(FootnoteCollectorContext);
}

export function FootnoteCollectorProvider(props: { children: React.ReactNode }) {
  let footnotesRef = useRef<CollectedFootnote[]>([]);
  let counterRef = useRef(1);

  let registerFootnote = useCallback(
    (footnote: Omit<CollectedFootnote, "index">) => {
      let existing = footnotesRef.current.find(
        (f) => f.footnoteId === footnote.footnoteId,
      );
      if (existing) return existing.index;
      let index = counterRef.current++;
      footnotesRef.current.push({ ...footnote, index });
      return index;
    },
    [],
  );

  let getFootnotes = useCallback(() => footnotesRef.current, []);

  let value = useMemo(
    () => ({ registerFootnote, getFootnotes }),
    [registerFootnote, getFootnotes],
  );

  return (
    <FootnoteCollectorContext.Provider value={value}>
      {props.children}
    </FootnoteCollectorContext.Provider>
  );
}
