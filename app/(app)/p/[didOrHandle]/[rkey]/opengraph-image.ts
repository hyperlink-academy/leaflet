import { ogScreenshotResponse } from "src/utils/screenshotPage";
import { supabaseServerClient } from "supabase/serverClient";
import { jsonToLex } from "@atproto/lexicon";
import { idResolver } from "src/identity";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import { coverImageRedirect } from "src/utils/ogCoverImageRedirect";
import { documentUriFilter } from "src/utils/uriHelpers";

// OG content is effectively immutable post-publish, and each regeneration is a
// multi-second remote-browser render billed for its full wall time — unfurl
// bots re-fetch these constantly.
export const revalidate = 86400;

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
        // Get CID from the blob ref (handle both serialized and hydrated forms)
        let cid =
          (docRecord.coverImage.ref as unknown as { $link: string })["$link"] ||
          docRecord.coverImage.ref.toString();
        let res = await coverImageRedirect(did, cid);
        if (res) return res;
        // Fall through to screenshot if the cover couldn't be cached
      }
    }
  }

  // Fall back to screenshot
  return ogScreenshotResponse(`/p/${params.didOrHandle}/${params.rkey}/`);
}
