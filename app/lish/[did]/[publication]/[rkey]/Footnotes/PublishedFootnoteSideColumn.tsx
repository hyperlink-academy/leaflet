"use client";

import { useCallback } from "react";
import { PublishedFootnote } from "./PublishedFootnotes";
import { TextBlockCore } from "../Blocks/TextBlockCore";
import { FootnoteSideColumnLayout } from "components/Footnotes/FootnoteSideColumnLayout";

type PublishedFootnoteItem = PublishedFootnote & {
  id: string;
};

export function PublishedFootnoteSideColumn(props: {
  footnotes: PublishedFootnote[];
}) {
  let items: PublishedFootnoteItem[] = props.footnotes.map((fn) => ({
    ...fn,
    id: fn.footnoteId,
  }));

  let getAnchorSelector = useCallback(
    (item: PublishedFootnoteItem) => `#fnref-${item.id}`,
    [],
  );

  let renderItem = useCallback(
    (item: PublishedFootnoteItem & { top: number }) => (
      <>
        <a
          href={`#fnref-${item.footnoteId}`}
          className="text-accent-contrast font-medium text-xs no-underline hover:underline"
        >
          {item.index}.
        </a>{" "}
        <span className="text-secondary">
          {item.contentPlaintext ? (
            <TextBlockCore
              plaintext={item.contentPlaintext}
              facets={item.contentFacets}
              index={[]}
            />
          ) : (
            <span className="italic text-tertiary">Empty footnote</span>
          )}
        </span>
      </>
    ),
    [],
  );

  return (
    <FootnoteSideColumnLayout
      items={items}
      visible={props.footnotes.length > 0}
      getAnchorSelector={getAnchorSelector}
      renderItem={renderItem}
    />
  );
}
