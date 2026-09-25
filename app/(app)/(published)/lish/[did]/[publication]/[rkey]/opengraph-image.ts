import { ogScreenshotResponse } from "src/utils/screenshotPage";
import { supabaseServerClient } from "supabase/serverClient";
import { jsonToLex } from "@atproto/lexicon";
import {
  coverImageCardPipeline,
  fetchCoverImageBytes,
} from "src/utils/uploadCoverImageThumb";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import { resolveDocumentFilter } from "src/utils/resolveDocumentFilter";
import { documentUriFilter } from "src/utils/uriHelpers";
import { fetchPublicationForPage } from "../getPublicationForPage";

// OG content is effectively immutable post-publish, and each regeneration is a
// multi-second remote-browser render billed for its full wall time — unfurl
// bots re-fetch these constantly.
export const revalidate = 86400;

export async function generateStaticParams() {
  return [];
}

export const size = { width: 1400, height: 733 };
export const contentType = "image/png";
export const alt = "Preview of this post";

export default async function OpenGraphImage(props: {
  params: Promise<{ publication: string; did: string; rkey: string }>;
}) {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  let publication = decodeURIComponent(params.publication);
  let rkey = decodeURIComponent(params.rkey);

  // Try to get the document's cover image
  let pub = await fetchPublicationForPage(did, publication);
  let { data: documents } = await supabaseServerClient
    .from("documents")
    .select("data")
    .or(
      pub
        ? await resolveDocumentFilter(did, pub.uri, rkey)
        : documentUriFilter(did, rkey),
    )
    .order("uri", { ascending: false })
    .limit(1);
  let document = documents?.[0];

  if (document) {
    const docRecord = normalizeDocumentRecord(jsonToLex(document.data));
    if (docRecord?.coverImage) {
      try {
        let bytes = await fetchCoverImageBytes(docRecord.coverImage, did);
        if (bytes) {
          let image = await coverImageCardPipeline(bytes, size)
            .png()
            .toBuffer();
          return new Response(new Uint8Array(image), {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      } catch (e) {
        // Fall through to screenshot if cover image fetch fails
        console.error("Failed to fetch cover image:", e);
      }
    }
  }

  // Fall back to screenshot
  return ogScreenshotResponse(
    `/lish/${decodeURIComponent(params.did)}/${decodeURIComponent(params.publication)}/${params.rkey}/`,
  );
}
