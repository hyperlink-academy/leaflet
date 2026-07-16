import { ogScreenshotResponse } from "src/utils/screenshotPage";
import { supabaseServerClient } from "supabase/serverClient";
import { jsonToLex } from "@atproto/lexicon";
import { fetchAtprotoBlob } from "app/api/atproto_images/route";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import { resolveDocumentFilter } from "../resolveDocumentFilter";

export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: Promise<{ publication: string; did: string; rkey: string }>;
}) {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  let publication = decodeURIComponent(params.publication);
  let rkey = decodeURIComponent(params.rkey);

  // Try to get the document's cover image
  let { data: documents } = await supabaseServerClient
    .from("documents")
    .select("data")
    .or(await resolveDocumentFilter(did, publication, rkey))
    .order("uri", { ascending: false })
    .limit(1);
  let document = documents?.[0];

  if (document) {
    const docRecord = normalizeDocumentRecord(jsonToLex(document.data));
    if (docRecord?.coverImage) {
      try {
        // Get CID from the blob ref (handle both serialized and hydrated forms)
        let cid =
          (docRecord.coverImage.ref as unknown as { $link: string })["$link"] ||
          docRecord.coverImage.ref.toString();

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

  // Fall back to screenshot
  return ogScreenshotResponse(
    `/lish/${decodeURIComponent(params.did)}/${decodeURIComponent(params.publication)}/${params.rkey}/`,
  );
}
