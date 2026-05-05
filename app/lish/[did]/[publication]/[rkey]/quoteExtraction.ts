import {
  PubLeafletBlocksText,
  PubLeafletBlocksUnorderedList,
  PubLeafletBlocksHeader,
  PubLeafletBlocksCode,
  PubLeafletPagesLinearDocument,
} from "lexicons/api";
import { QuotePosition } from "./quotePosition";

export function extractQuotedBlocks(
  blocks: PubLeafletPagesLinearDocument.Block[],
  quotePosition: QuotePosition,
  currentPath: number[],
): PubLeafletPagesLinearDocument.Block[] {
  const result: PubLeafletPagesLinearDocument.Block[] = [];

  blocks.forEach((block, index) => {
    const blockPath = [...currentPath, index];

    if (PubLeafletBlocksUnorderedList.isMain(block.block)) {
      const quotedChildren = extractQuotedListItems(
        block.block.children,
        quotePosition,
        blockPath,
      );

      if (quotedChildren.length > 0) {
        result.push({
          ...block,
          block: {
            ...block.block,
            children: quotedChildren,
          },
        });
      }
      return;
    }

    if (!isBlockInRange(blockPath, quotePosition)) {
      return;
    }
    if (
      PubLeafletBlocksText.isMain(block.block) ||
      PubLeafletBlocksHeader.isMain(block.block) ||
      PubLeafletBlocksCode.isMain(block.block)
    ) {
      const trimmedBlock = trimTextBlock(block, blockPath, quotePosition);
      if (trimmedBlock) {
        result.push(trimmedBlock);
      }
    } else {
      result.push(block);
    }
  });

  return result;
}

export function extractQuotedListItems(
  items: PubLeafletBlocksUnorderedList.ListItem[],
  quotePosition: QuotePosition,
  parentPath: number[],
): PubLeafletBlocksUnorderedList.ListItem[] {
  const result: PubLeafletBlocksUnorderedList.ListItem[] = [];
  if (!Array.isArray(items)) return [];

  items.forEach((item, index) => {
    const itemPath = [...parentPath, index];

    const contentBlock = { block: item.content };
    const trimmedContent = isBlockInRange(itemPath, quotePosition)
      ? trimTextBlock(contentBlock, itemPath, quotePosition)
      : null;

    let quotedChildren: PubLeafletBlocksUnorderedList.ListItem[] = [];
    if (item.children) {
      quotedChildren = extractQuotedListItems(
        item.children,
        quotePosition,
        itemPath,
      );
    }

    if (!trimmedContent && !quotedChildren.length) {
      return;
    }

    result.push({
      content: trimmedContent?.block || { $type: "null" },
      children: quotedChildren.length > 0 ? quotedChildren : undefined,
    });
  });

  return result;
}

export function isBlockInRange(
  blockPath: number[],
  quotePosition: QuotePosition,
): boolean {
  const { start, end } = quotePosition;
  const isAfterStart = compareBlockPaths(blockPath, start.block) >= 0;
  const isBeforeEnd = compareBlockPaths(blockPath, end.block) <= 0;
  return isAfterStart && isBeforeEnd;
}

export function compareBlockPaths(path1: number[], path2: number[]): number {
  const minLength = Math.min(path1.length, path2.length);

  for (let i = 0; i < minLength; i++) {
    if (path1[i] < path2[i]) return -1;
    if (path1[i] > path2[i]) return 1;
  }

  return path1.length - path2.length;
}

export function trimTextBlock(
  block: PubLeafletPagesLinearDocument.Block,
  blockPath: number[],
  quotePosition: QuotePosition,
): PubLeafletPagesLinearDocument.Block | null {
  if (
    !PubLeafletBlocksText.isMain(block.block) &&
    !PubLeafletBlocksHeader.isMain(block.block) &&
    !PubLeafletBlocksCode.isMain(block.block)
  ) {
    return block;
  }

  const { start, end } = quotePosition;
  let startOffset = 0;
  let endOffset = block.block.plaintext.length;

  if (arraysEqual(blockPath, start.block)) {
    startOffset = start.offset;
  }

  if (arraysEqual(blockPath, end.block)) {
    endOffset = end.offset;
  }

  const quotedText = block.block.plaintext.substring(startOffset, endOffset);
  if (!quotedText) return null;

  let adjustedFacets;
  if (
    PubLeafletBlocksText.isMain(block.block) ||
    PubLeafletBlocksHeader.isMain(block.block)
  ) {
    adjustedFacets = !Array.isArray(block.block?.facets)
      ? []
      : (block.block?.facets
          ?.map((facet) => {
            const facetStart = facet.index.byteStart;
            const facetEnd = facet.index.byteEnd;

            if (facetEnd <= startOffset || facetStart >= endOffset) {
              return null;
            }

            return {
              ...facet,
              index: {
                byteStart: Math.max(0, facetStart - startOffset),
                byteEnd: Math.min(quotedText.length, facetEnd - startOffset),
              },
            };
          })
          .filter((f) => f !== null) as typeof block.block.facets);
  }

  return {
    ...block,
    block: {
      ...block.block,
      plaintext: quotedText,
      //@ts-ignore
      facets: adjustedFacets,
    },
  };
}

export function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((val, index) => val === b[index]);
}

export function quotedBlocksToPlaintext(
  blocks: PubLeafletPagesLinearDocument.Block[],
): string {
  const parts: string[] = [];
  collectPlaintext(blocks, parts);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function collectPlaintext(
  blocks: PubLeafletPagesLinearDocument.Block[],
  out: string[],
): void {
  for (const block of blocks) {
    if (PubLeafletBlocksUnorderedList.isMain(block.block)) {
      collectPlaintextFromListItems(block.block.children, out);
      continue;
    }
    if (
      PubLeafletBlocksText.isMain(block.block) ||
      PubLeafletBlocksHeader.isMain(block.block) ||
      PubLeafletBlocksCode.isMain(block.block)
    ) {
      if (block.block.plaintext) out.push(block.block.plaintext);
    }
  }
}

function collectPlaintextFromListItems(
  items: PubLeafletBlocksUnorderedList.ListItem[] | undefined,
  out: string[],
): void {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    const content = item.content as { plaintext?: string } | undefined;
    if (content && typeof content.plaintext === "string" && content.plaintext) {
      out.push(content.plaintext);
    }
    if (item.children) collectPlaintextFromListItems(item.children, out);
  }
}
