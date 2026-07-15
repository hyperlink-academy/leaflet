import sharp from "sharp";
import { BlobRef } from "@atproto/api";
import { fetchAtprotoBlob } from "app/api/atproto_images/route";

// Fetch a document's cover image from its author's PDS, resize it to a Bluesky
// external-card thumbnail (1200x630 webp), and upload it via `uploadThumb`.
// The blob is uploaded to whichever repo `uploadThumb` targets, which is the
// post author's — not necessarily the cover image's author, since a viewer
// cross-posting someone else's post uploads the thumb to their own repo.
//
// Returns null when there's no cover image or any step fails so callers degrade
// to a card without a thumbnail rather than failing the post.
export async function uploadCoverImageThumb<T>(
  coverImage: BlobRef | undefined,
  authorDid: string | undefined,
  uploadThumb: (bytes: Buffer) => Promise<T>,
): Promise<T | null> {
  if (!coverImage || !authorDid) return null;

  let cid =
    (coverImage.ref as unknown as { $link: string })["$link"] ||
    coverImage.ref.toString();

  let coverImageResponse = await fetchAtprotoBlob(authorDid, cid);
  if (!coverImageResponse) return null;

  try {
    let resizedImage = await sharp(
      await (await coverImageResponse.blob()).arrayBuffer(),
    )
      .resize({ width: 1200, height: 630, fit: "cover" })
      .webp({ quality: 85 })
      .toBuffer();
    return await uploadThumb(resizedImage);
  } catch (e) {
    console.error("Failed to process bsky card thumbnail:", e);
    return null;
  }
}
