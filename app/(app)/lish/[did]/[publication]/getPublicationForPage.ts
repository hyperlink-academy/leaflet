import { supabaseServerClient } from "supabase/serverClient";
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";

export async function fetchPublicationForPage(
  did: string,
  publicationName: string,
) {
  const { data } = await supabaseServerClient
    .from("publications")
    .select(
      `uri, name, identity_did, record,
       publication_newsletter_settings(enabled),
       publication_pages(id, path, title, record, record_uri, sort_order)`,
    )
    .eq("identity_did", did)
    .or(publicationNameOrUriFilter(did, publicationName))
    .order("uri", { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}

export type PublicationForPage = NonNullable<
  Awaited<ReturnType<typeof fetchPublicationForPage>>
>;

// Fetched separately from the publication row because most requests through
// fetchPublicationForPage (every post URL, any page without a posts list)
// never render the post list — loading every document's full record jsonb up
// front made the common path pay for the rare one.
export async function fetchPublicationPostRows(publicationUri: string) {
  const { data } = await supabaseServerClient
    .from("documents_in_publications")
    .select(
      `documents(uri, data,
         comments_on_documents(count),
         document_mentions_in_bsky(count),
         recommends_on_documents(count))`,
    )
    .eq("publication", publicationUri);
  return data ?? [];
}
