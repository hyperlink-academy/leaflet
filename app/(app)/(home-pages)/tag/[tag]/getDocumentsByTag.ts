"use server";

import { getPublicationURL } from "app/(app)/lish/createPub/getPublicationURL";
import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/api";
import { idResolver } from "src/identity";
import type { Post } from "app/(app)/(home-pages)/reader/getReaderFeed";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import { deduplicateByUriOrdered } from "src/utils/deduplicateRecords";
import { resolveBylineProfiles } from "src/utils/resolveBylineProfiles";

export async function getDocumentsByTag(
  tag: string,
): Promise<{ posts: Post[] }> {
  // Resolve the tag to document uris first via a function whose plan is
  // pinned to the document_tags tag index. Ordering by sort_date with a limit
  // while joining in one query lets the planner walk the sort_date index and
  // probe every document for the tag — a full table scan for rare tags.
  // document_tags stores lowercased tags (tag links come from search_tags),
  // so match on the lowercased tag.
  const { data: tagged, error: tagError } = await supabaseServerClient.rpc(
    "get_tag_page_document_uris",
    { tag_query: tag.toLowerCase(), max_count: 50 },
  );

  let uris: string[];
  if (tagError) {
    // The function ships in a migration that deploys separately from this
    // code; if it isn't there (yet), degrade to querying document_tags
    // directly rather than rendering an empty page. The cap keeps the .in()
    // filter below URL length limits, so a very popular tag may miss some of
    // its newest posts until the function exists.
    console.error("Error fetching tag document uris:", tagError);
    const { data: fallback, error: fallbackError } = await supabaseServerClient
      .from("document_tags")
      .select("uri")
      .eq("tag", tag.toLowerCase())
      .limit(200);
    if (fallbackError) {
      console.error("Error fetching documents by tag:", fallbackError);
      return { posts: [] };
    }
    uris = (fallback || []).map((row) => row.uri);
  } else {
    uris = (tagged || []).map((row) => row.uri);
  }
  if (uris.length === 0) {
    return { posts: [] };
  }

  const { data: rawDocuments, error } = await supabaseServerClient
    .from("documents")
    .select(
      `*,
      comments_on_documents(count),
      document_mentions_in_bsky(count),
      recommends_on_documents(count),
      documents_in_publications(publications(*))`,
    )
    .in("uri", uris)
    .order("sort_date", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching documents by tag:", error);
    return { posts: [] };
  }

  // Deduplicate records that may exist under both pub.leaflet and site.standard namespaces
  const documents = deduplicateByUriOrdered(rawDocuments || []);

  const posts = await Promise.all(
    documents.map(async (doc) => {
      const pub = doc.documents_in_publications[0]?.publications;

      // Skip if document doesn't have a publication
      if (!pub) {
        return null;
      }

      // Skip if document has no sort_date
      if (!doc.sort_date) {
        return null;
      }

      // Normalize the document data - skip unrecognized formats
      const normalizedData = normalizeDocumentRecord(doc.data, doc.uri);
      if (!normalizedData) {
        return null;
      }

      const normalizedPubRecord = normalizePublicationRecord(pub?.record);

      const uri = new AtUri(doc.uri);
      const handle = await idResolver.did.resolve(uri.host);

      const post: Post = {
        publication: {
          href: getPublicationURL(pub),
          pubRecord: normalizedPubRecord,
          uri: pub?.uri || "",
        },
        ownerDid: handle?.alsoKnownAs?.[0]
          ? `@${handle.alsoKnownAs[0].slice(5)}`
          : null,
        contributors: await resolveBylineProfiles(normalizedData, uri.host),
        documents: {
          comments_on_documents: doc.comments_on_documents,
          document_mentions_in_bsky: doc.document_mentions_in_bsky,
          recommends_on_documents: doc.recommends_on_documents,
          data: normalizedData,
          uri: doc.uri,
          sort_date: doc.sort_date,
        },
      };
      return post;
    }),
  );

  // Filter out null entries (documents without publications)
  return {
    posts: posts.filter((p): p is Post => p !== null),
  };
}
