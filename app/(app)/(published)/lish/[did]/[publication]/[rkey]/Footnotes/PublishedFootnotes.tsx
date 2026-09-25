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

type SourceBlock =
  | PubLeafletBlocksText.Main
  | PubLeafletBlocksHeader.Main
  | PubLeafletBlocksBlockquote.Main;

export type PublishedFootnote = {
  footnoteId: string;
  index: number;
  contentPlaintext: string;
  contentFacets?: PubLeafletRichtextFacet.Main[];
  // The block the footnote's ref sits in, previewed from the footnote list.
  source: SourceBlock;
};

export function collectFootnotesFromBlocks(
  blocks: PubLeafletPagesLinearDocument.Block[],
): PublishedFootnote[] {
  let footnotes: PublishedFootnote[] = [];
  let seen = new Set<string>();
  let idx = 1;

  function scanFacets(content: SourceBlock) {
    let facets = content.facets;
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
              source: content,
            });
          }
        }
      }
    }
  }

  function scanBlockContent(content: SourceBlock | { $type?: string }) {
    if (
      PubLeafletBlocksText.isMain(content) ||
      PubLeafletBlocksHeader.isMain(content) ||
      PubLeafletBlocksBlockquote.isMain(content)
    ) {
      scanFacets(content);
    }
  }

  function scanOrderedListItems(items: PubLeafletBlocksOrderedList.ListItem[]) {
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

// The preview is a copy of text already on the page, so its refs mustn't
// reuse the real refs' fnref- ids or links.
function PreviewFootnoteRef(props: { footnoteId: string; index: number }) {
  return (
    <sup
      className="text-accent-contrast -ml-0.5 -mr-1 -my-1 p-1"
      data-footnote-id={props.footnoteId}
    >
      {props.index}
    </sup>
  );
}

export function PublishedFootnoteSection(props: {
  footnotes: PublishedFootnote[];
  footnoteIndexMap: Map<string, number>;
}) {
  if (props.footnotes.length === 0) return null;

  return (
    <FootnoteSectionLayout className="mt-4">
      {props.footnotes.map((fn) => (
        <PublishedFootnoteItem
          key={fn.footnoteId}
          footnote={fn}
          footnoteIndexMap={props.footnoteIndexMap}
        />
      ))}
    </FootnoteSectionLayout>
  );
}

function PublishedFootnoteItem(props: {
  footnote: PublishedFootnote;
  footnoteIndexMap: Map<string, number>;
}) {
  let fn = props.footnote;
  return (
    <FootnoteItemLayout
      index={fn.index}
      indexHref={`#fnref-${fn.footnoteId}`}
      id={`fn-${fn.footnoteId}`}
      sourcePreview={{
        footnoteID: fn.footnoteId,
        sourceSelector: `[id="fnref-${fn.footnoteId}"]`,
        content: (
          <div
            className={
              PubLeafletBlocksHeader.isMain(fn.source) ? "font-bold" : ""
            }
          >
            <TextBlockCore
              plaintext={fn.source.plaintext}
              facets={fn.source.facets}
              index={[]}
              footnoteIndexMap={props.footnoteIndexMap}
              renderers={{ FootnoteRef: PreviewFootnoteRef }}
            />
          </div>
        ),
      }}
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
