"use client";

import {
  PubLeafletRichtextFacet,
  PubLeafletBlocksText,
  PubLeafletBlocksHeader,
  PubLeafletBlocksBlockquote,
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
    if (!facets) return;
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

  for (let b of blocks) {
    let block = b.block;
    let facets: PubLeafletRichtextFacet.Main[] | undefined;
    if (PubLeafletBlocksText.isMain(block)) {
      facets = block.facets;
    } else if (PubLeafletBlocksHeader.isMain(block)) {
      facets = block.facets;
    } else if (PubLeafletBlocksBlockquote.isMain(block)) {
      facets = block.facets;
    }
    if (facets) scanFacets(facets);
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

export function PublishedFootnoteItem(props: {
  footnote: PublishedFootnote;
}) {
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
