import type { NormalizedDocument } from "src/utils/normalizeRecords";
import { findDocumentBlocks } from "src/utils/documentHasBlock";

// The element id a published questions or reply block renders under, so
// emails and notifications can link straight to it. A block published
// before blocks had keys keeps the bare name older links used.
export function interactionBlockAnchor(
  kind: "questions" | "replies",
  key: string | null | undefined,
) {
  return key ? `${kind}-${key}` : kind;
}

// The key interactions record for the editor block `entityID` once it's
// published (see resolveInteractionBlock): its own entity id, or null when
// the published document predates block keys. Undefined while the block
// hasn't been published.
export function publishedBlockKey(
  document: NormalizedDocument | null | undefined,
  type: string,
  entityID: string,
): string | null | undefined {
  const blocks = findDocumentBlocks(document, type);
  if (blocks.some((b) => b.key === entityID)) return entityID;
  return blocks.some((b) => !b.key) ? null : undefined;
}
