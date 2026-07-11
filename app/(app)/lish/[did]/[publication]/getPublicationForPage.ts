import { supabaseServerClient } from "supabase/serverClient";
import {
  publicationNameOrUriFilter,
  publicationUriVariants,
} from "src/utils/uriHelpers";
import { dedupeDocumentsInPublications } from "src/utils/deduplicateRecords";

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
  const publication = data?.[0];
  if (!publication) return null;

  // Documents link to whichever namespace URI their record names, and the
  // publication may be indexed under both — fetch links for both variants so
  // legacy pub.leaflet-only posts still show up alongside migrated ones.
  const { data: docLinks } = await supabaseServerClient
    .from("documents_in_publications")
    .select(
      `documents(uri, data,
         comments_on_documents(count),
         document_mentions_in_bsky(count),
         recommends_on_documents(count))`,
    )
    .in("publication", publicationUriVariants(publication.uri));

  return {
    ...publication,
    documents_in_publications: dedupeDocumentsInPublications(docLinks ?? []),
  };
}

export type PublicationForPage = NonNullable<
  Awaited<ReturnType<typeof fetchPublicationForPage>>
>;
