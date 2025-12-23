import { getMicroLinkOgImage } from "src/utils/getMicroLinkOgImage";
import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import { ids } from "lexicons/api/lexicons";
import { PubLeafletDocument } from "lexicons/api";
import { jsonToLex } from "@atproto/lexicon";
import { idResolver } from "app/(home-pages)/reader/idResolver";
import { fetchAtprotoBlob } from "app/api/atproto_images/route";

export const revalidate = 60;

export default async function OpenGraphImage(props: {
  params: Promise<{ rkey: string; didOrHandle: string }>;
}) {
  let params = await props.params;
  let didOrHandle = decodeURIComponent(params.didOrHandle);

  // Resolve handle to DID if needed
  let did = didOrHandle;
  if (!didOrHandle.startsWith("did:")) {
    try {
      let resolved = await idResolver.handle.resolve(didOrHandle);
      if (resolved) did = resolved;
    } catch (e) {
      // Fall back to screenshot if handle resolution fails
    }
  }

  if (did) {
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
  }

  // Fall back to screenshot
  return getMicroLinkOgImage(`/p/${params.didOrHandle}/${params.rkey}/`);
}
