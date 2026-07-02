import { cacheTag } from "next/cache";
import { pubTag } from "src/cacheTags";
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
       publication_pages(id, path, title, record, record_uri, sort_order),
       documents_in_publications(documents(uri, data,
         comments_on_documents(count),
         document_mentions_in_bsky(count),
         recommends_on_documents(count)))`,
    )
    .eq("identity_did", did)
    .or(publicationNameOrUriFilter(did, publicationName))
    .order("uri", { ascending: false })
    .limit(1);
  // Runs inside the calling page's "use cache" scope.
  if (data?.[0]) cacheTag(pubTag(data[0].uri));
  return data?.[0] ?? null;
}

export type PublicationForPage = NonNullable<
  Awaited<ReturnType<typeof fetchPublicationForPage>>
>;
