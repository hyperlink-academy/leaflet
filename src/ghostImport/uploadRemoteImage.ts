import sharp from "sharp";
import { v7 } from "uuid";
import { supabaseServerClient } from "supabase/serverClient";
import type { ImageData } from "./ghostPostToLeaflet";

const ASSET_BUCKET = "minilink-user-assets";

// Copy an image into Leaflet storage byte-for-byte. Unlike the browser
// uploader (src/utils/addImage.ts) nothing is re-encoded and no thumbhash
// placeholder is computed, so imported images have no blur-up.
export async function uploadRemoteImage(url: string): Promise<ImageData> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Fetching ${url} failed: HTTP ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/"))
    throw new Error(`${url} is not an image (${contentType})`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const { width, height } = await sharp(bytes).metadata();
  if (!width || !height) throw new Error(`Could not read the size of ${url}`);

  // The browser uploader keeps the extension on animated files so the image
  // proxy serves them untouched.
  const fileID = v7() + (contentType === "image/gif" ? ".gif" : "");
  const { error } = await supabaseServerClient.storage
    .from(ASSET_BUCKET)
    .upload(fileID, bytes, { contentType, cacheControl: "31536000" });
  if (error) throw new Error(`Uploading ${url} failed: ${error.message}`);
  const src = supabaseServerClient.storage
    .from(ASSET_BUCKET)
    .getPublicUrl(fileID).data.publicUrl;
  return { src, width, height, fallback: "" };
}
