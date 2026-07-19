import { ogScreenshotResponse } from "src/utils/screenshotPage";
import { supabaseServerClient } from "supabase/serverClient";
import { jsonToLex } from "@atproto/lexicon";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import { coverImageRedirect } from "src/utils/ogCoverImageRedirect";
import { resolveDocumentFilter } from "../resolveDocumentFilter";

// OG content is effectively immutable post-publish, and each regeneration is a
// multi-second remote-browser render billed for its full wall time — unfurl
// bots re-fetch these constantly.
export const revalidate = 86400;

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
      let res = await coverImageRedirect(did, docRecord.coverImage.ref);
      if (res) return res;
      // Fall through to screenshot if the cover couldn't be cached
    }
  }

  // Fall back to screenshot
  return ogScreenshotResponse(
    `/lish/${decodeURIComponent(params.did)}/${decodeURIComponent(params.publication)}/${params.rkey}/`,
  );
}
