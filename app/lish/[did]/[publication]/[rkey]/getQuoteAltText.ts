import { supabaseServerClient } from "supabase/serverClient";
import {
  normalizeDocumentRecord,
  getDocumentPages,
} from "src/utils/normalizeRecords";
import { documentUriFilter } from "src/utils/uriHelpers";
import { PubLeafletPagesLinearDocument } from "lexicons/api";
import { QuotePosition } from "./quotePosition";
import {
  extractQuotedBlocks,
  quotedBlocksToPlaintext,
} from "./quoteExtraction";

const MAX_ALT_LENGTH = 420;

export async function getQuoteAltText(
  did: string,
  rkey: string,
  position: QuotePosition,
): Promise<string | null> {
  const { data: documents } = await supabaseServerClient
    .from("documents")
    .select("*")
    .or(documentUriFilter(did, rkey))
    .order("uri", { ascending: false })
    .limit(1);

  const document = documents?.[0];
  if (!document) return null;

  const docRecord = normalizeDocumentRecord(document.data);
  if (!docRecord) return null;

  const pages = getDocumentPages(docRecord) as
    | PubLeafletPagesLinearDocument.Main[]
    | undefined;
  if (!pages || pages.length === 0) return null;

  const page = position.pageId
    ? pages.find((p) => p.id === position.pageId)
    : pages[0];
  if (!page) return null;

  const blocks = extractQuotedBlocks(page.blocks || [], position, []);
  const text = quotedBlocksToPlaintext(blocks);
  if (!text) return null;

  return text.length > MAX_ALT_LENGTH
    ? text.slice(0, MAX_ALT_LENGTH - 1).trimEnd() + "…"
    : text;
}
