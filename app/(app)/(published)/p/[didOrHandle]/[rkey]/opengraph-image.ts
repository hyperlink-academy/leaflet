import { ogScreenshotResponse } from "src/utils/screenshotPage";
import { supabaseServerClient } from "supabase/serverClient";
import { jsonToLex } from "@atproto/lexicon";
import { resolveDid } from "../resolveDid";
import { fetchAtprotoBlob } from "app/api/atproto_images/route";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import { documentUriFilter } from "src/utils/uriHelpers";

// OG content is effectively immutable post-publish, and each regeneration is a
// multi-second remote-browser render billed for its full wall time — unfurl
// bots re-fetch these constantly.
export const revalidate = 86400;

export async function generateStaticParams() {
  return [];
}

export default async function OpenGraphImage(props: {
  params: Promise<{ rkey: string; didOrHandle: string }>;
}) {
  let params = await props.params;
  // Falls back to the screenshot when a handle doesn't resolve.
  let did = await resolveDid(decodeURIComponent(params.didOrHandle));

  if (did) {
    // Try to get the document's cover image
    let { data: documents } = await supabaseServerClient
      .from("documents")
      .select("data")
      .or(documentUriFilter(did, params.rkey))
      .order("uri", { ascending: false })
      .limit(1);
    let document = documents?.[0];

    if (document) {
      const docRecord = normalizeDocumentRecord(jsonToLex(document.data));
      if (docRecord?.coverImage) {
        try {
          // Get CID from the blob ref (handle both serialized and hydrated forms)
          let cid =
            (docRecord.coverImage.ref as unknown as { $link: string })[
              "$link"
            ] || docRecord.coverImage.ref.toString();

          let imageResponse = await fetchAtprotoBlob(did, cid);
          if (imageResponse) {
            let imageBlob = await imageResponse.blob();

            // Return the image with appropriate headers
            return new Response(imageBlob, {
              headers: {
                "Content-Type": imageBlob.type || "image/jpeg",
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
  }

  // Fall back to screenshot
  return ogScreenshotResponse(`/p/${params.didOrHandle}/${params.rkey}/`);
}
