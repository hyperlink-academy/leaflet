"use client";

import { useCallback } from "react";
import { PublishedFootnote } from "./PublishedFootnotes";
import { TextBlockCore } from "../Blocks/TextBlockCore";
import { FootnoteSideColumnLayout } from "components/Footnotes/FootnoteSideColumnLayout";
import { FootnoteItemLayout } from "components/Footnotes/FootnoteItemLayout";

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
      <FootnoteItemLayout
        index={item.index}
        indexHref={`#fnref-${item.footnoteId}`}
      >
        {item.contentPlaintext ? (
          <TextBlockCore
            plaintext={item.contentPlaintext}
            facets={item.contentFacets}
            index={[]}
          />
        ) : (
          <span className="italic text-tertiary">Empty footnote</span>
        )}
      </FootnoteItemLayout>
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
