import { BlobRef } from "@atproto/lexicon";

export const blobRefToSrc = (b: BlobRef["ref"], did: string) =>
  `/api/atproto_images?did=${did}&cid=${(b as unknown as { $link: string })["$link"]}`;
