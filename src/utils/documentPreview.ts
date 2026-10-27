import { ids } from "lexicons/api/lexicons";
import { isLeafletDocument, isStandardDocument } from "lexicons/src/normalize";

type Page = { blocks?: { block?: { $type?: string; plaintext?: unknown } }[] };

// Anything that lists documents (feeds, post lists, dashboards, identity,
// notifications) renders only record metadata plus what getFirstParagraph,
// hasLeafletContent and the members-only gate read, so it ships this preview
// instead of each document's block tree. Gated blocks come after the
// delimiter, so they are never in a preview. Replaces every document record
// (raw or normalized) found anywhere in `value`; only post pages ship content.
export function toDocumentPreviews<T>(value: T): T {
  if (Array.isArray(value)) return value.map(toDocumentPreviews) as T;
  if (value?.constructor !== Object) return value;
  if (isStandardDocument(value) || isLeafletDocument(value)) {
    let { pages, content, textContent, ...doc } = value as Record<string, any>;
    if (pages) return { ...doc, pages: previewPages(pages) } as T;
    if (!content) return doc as T;
    return {
      ...doc,
      content: { $type: content.$type, pages: previewPages(content.pages) },
    } as T;
  }
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, toDocumentPreviews(v)]),
  ) as T;
}

function previewPages(pages: Page[] | undefined) {
  let blocks = pages?.[0]?.blocks;
  if (!blocks) return pages && [];
  let end = blocks.findIndex(
    (b) => b.block?.$type === ids.PubLeafletBlocksMembersOnlyDelimiter,
  );
  let paragraph = (end === -1 ? blocks : blocks.slice(0, end)).find(
    (b) => b.block?.$type === ids.PubLeafletBlocksText && b.block.plaintext,
  );
  return [{ ...pages![0], blocks: [paragraph, blocks[end]].filter(Boolean) }];
}
