"use client";

import {
  PubLeafletRichtextFacet,
  PubLeafletBlocksText,
  PubLeafletBlocksHeader,
  PubLeafletBlocksBlockquote,
  PubLeafletBlocksOrderedList,
  PubLeafletBlocksUnorderedList,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { TextBlockCore } from "../Blocks/TextBlockCore";
import {
  FootnoteItemLayout,
  FootnoteSectionLayout,
} from "components/Footnotes/FootnoteItemLayout";

export type PublishedFootnote = {
  footnoteId: string;
  index: number;
  contentPlaintext: string;
  contentFacets?: PubLeafletRichtextFacet.Main[];
};

export function collectFootnotesFromBlocks(
  blocks: PubLeafletPagesLinearDocument.Block[],
): PublishedFootnote[] {
  let footnotes: PublishedFootnote[] = [];
  let seen = new Set<string>();
  let idx = 1;

  function scanFacets(facets?: PubLeafletRichtextFacet.Main[]) {
    if (!facets || !Array.isArray(facets)) return;
    for (let facet of facets) {
      for (let feature of facet.features) {
        if (PubLeafletRichtextFacet.isFootnote(feature)) {
          if (!seen.has(feature.footnoteId)) {
            seen.add(feature.footnoteId);
            footnotes.push({
              footnoteId: feature.footnoteId,
              index: idx++,
              contentPlaintext: feature.contentPlaintext,
              contentFacets: feature.contentFacets,
            });
          }
        }
      }
    }
  }

  function scanBlockContent(
    content:
      | PubLeafletBlocksText.Main
      | PubLeafletBlocksHeader.Main
      | PubLeafletBlocksBlockquote.Main
      | { $type?: string },
  ) {
    if (PubLeafletBlocksText.isMain(content)) {
      scanFacets(content.facets);
    } else if (PubLeafletBlocksHeader.isMain(content)) {
      scanFacets(content.facets);
    } else if (PubLeafletBlocksBlockquote.isMain(content)) {
      scanFacets(content.facets);
    }
  }

  function scanOrderedListItems(
    items: PubLeafletBlocksOrderedList.ListItem[],
  ) {
    for (let item of items) {
      scanBlockContent(item.content);
      if (item.children?.length) {
        scanOrderedListItems(item.children);
      }
      if (item.unorderedListChildren?.children?.length) {
        scanUnorderedListItems(item.unorderedListChildren.children);
      }
    }
  }

  function scanUnorderedListItems(
    items: PubLeafletBlocksUnorderedList.ListItem[],
  ) {
    for (let item of items) {
      scanBlockContent(item.content);
      if (item.children?.length) {
        scanUnorderedListItems(item.children);
      }
      if (item.orderedListChildren?.children?.length) {
        scanOrderedListItems(item.orderedListChildren.children);
      }
    }
  }

  for (let b of blocks) {
    let block = b.block;
    if (PubLeafletBlocksOrderedList.isMain(block)) {
      scanOrderedListItems(block.children);
    } else if (PubLeafletBlocksUnorderedList.isMain(block)) {
      scanUnorderedListItems(block.children);
    } else {
      scanBlockContent(block);
    }
  }

  return footnotes;
}

export function buildFootnoteIndexMap(
  footnotes: PublishedFootnote[],
): Map<string, number> {
  let map = new Map<string, number>();
  for (let fn of footnotes) {
    map.set(fn.footnoteId, fn.index);
  }
  return map;
}

export function PublishedFootnoteSection(props: {
  footnotes: PublishedFootnote[];
}) {
  if (props.footnotes.length === 0) return null;

  return (
    <FootnoteSectionLayout className="mt-4">
      {props.footnotes.map((fn) => (
        <PublishedFootnoteItem key={fn.footnoteId} footnote={fn} />
      ))}
    </FootnoteSectionLayout>
  );
}

export function PublishedFootnoteItem(props: { footnote: PublishedFootnote }) {
  let fn = props.footnote;
  return (
    <FootnoteItemLayout
      index={fn.index}
      indexHref={`#fnref-${fn.footnoteId}`}
      id={`fn-${fn.footnoteId}`}
    >
      {fn.contentPlaintext ? (
        <TextBlockCore
          plaintext={fn.contentPlaintext}
          facets={fn.contentFacets}
          index={[]}
        />
      ) : (
        <span className="italic text-tertiary">Empty footnote</span>
      )}
    </FootnoteItemLayout>
  );
}
