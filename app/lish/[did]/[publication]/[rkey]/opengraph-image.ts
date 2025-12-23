import { getMicroLinkOgImage } from "src/utils/getMicroLinkOgImage";
import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import { ids } from "lexicons/api/lexicons";
import { PubLeafletDocument } from "lexicons/api";
import { jsonToLex } from "@atproto/lexicon";
import { fetchAtprotoBlob } from "app/api/atproto_images/route";

export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: Promise<{ publication: string; did: string; rkey: string }>;
}) {
  let params = await props.params;
  let did = decodeURIComponent(params.did);

  // Try to get the document's cover image
  let { data: document } = await supabaseServerClient
    .from("documents")
    .select("data")
    .eq("uri", AtUri.make(did, ids.PubLeafletDocument, params.rkey).toString())
    .single();

  if (document) {
    let docRecord = jsonToLex(document.data) as PubLeafletDocument.Record;
    if (docRecord.coverImage) {
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
  return getMicroLinkOgImage(
    `/lish/${decodeURIComponent(params.did)}/${decodeURIComponent(params.publication)}/${params.rkey}/`,
  );
}
