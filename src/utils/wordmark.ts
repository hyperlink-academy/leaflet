import type { PubLeafletPublication } from "lexicons/api";
import { blobRefToSrc } from "./blobRefToSrc";

export type WordmarkData = { src: string; width?: number };

// Resolves a published publication theme's wordmark into a renderable image
// src + width. Returns null when no wordmark is set (callers fall back to the
// logo + name). For draft editing, the wordmark src comes from the
// theme/wordmark-image fact instead — see the editor.
export function wordmarkFromTheme(
  theme: PubLeafletPublication.Theme | undefined | null,
  did: string,
): WordmarkData | null {
  const wordmark = theme?.wordmark;
  if (!wordmark?.image?.ref) return null;
  return {
    src: blobRefToSrc(wordmark.image.ref, did),
    width: wordmark.width ?? undefined,
  };
}
