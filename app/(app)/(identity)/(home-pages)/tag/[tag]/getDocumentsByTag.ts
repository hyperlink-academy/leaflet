"use server";

import { getPublicationURL } from "src/utils/getPublicationURL";
import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/api";
import { idResolver } from "src/identity";
import type { Post } from "actions/reader/getReaderFeed";
import {
  getDocumentPages,
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import { truncatePagesAtMembersDelimiter } from "src/membership";
import { deduplicateByUriOrdered } from "src/utils/deduplicateRecords";
import { resolveBylineProfiles } from "src/utils/resolveBylineProfiles";
import { getTagDocumentUrisByTrending } from "./getTagDocumentUrisByTrending";
import { getPublicationTagDocumentUris } from "./getPublicationTagDocumentUris";

const DOCUMENT_SELECT = `*,
      comments_on_documents(count),
      document_mentions_in_bsky(count),
      recommends_on_documents(count),
      documents_in_publications(publications(*))`;

function queryDocuments() {
  return supabaseServerClient.from("documents").select(DOCUMENT_SELECT);
}

type DocumentRow = NonNullable<
  Awaited<ReturnType<typeof queryDocuments>>["data"]
>[number];

export async function getDocumentsByTag(
  tag: string,
  options?: { orderBy?: "recent" | "trending" },
): Promise<{ posts: Post[] }> {
  // document_tags stores lowercased tags (tag links come from search_tags), so
  // match on the lowercased tag.
  if (options?.orderBy === "trending") {
    const uris = await getTagDocumentUrisByTrending(tag.toLowerCase(), 50);
    return { posts: await getPostsInOrder(uris) };
  }

  const uris = await getNewestTagDocumentUris(tag.toLowerCase());
  if (uris.length === 0) {
    return { posts: [] };
  }

  const { data: rawDocuments, error } = await queryDocuments()
    .in("uri", uris)
    .order("sort_date", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching documents by tag:", error);
    return { posts: [] };
  }

  // Deduplicate records that may exist under both pub.leaflet and site.standard namespaces
  return { posts: await toPosts(deduplicateByUriOrdered(rawDocuments || [])) };
}

// Every post in a publication carrying a tag, ranked by trending.
export async function getPublicationDocumentsByTag(
  tag: string,
  publicationUri: string,
): Promise<{ posts: Post[] }> {
  const uris = await getPublicationTagDocumentUris(
    tag.toLowerCase(),
    publicationUri,
  );
  return { posts: await getPostsInOrder(uris) };
}

// Batched so an unbounded uri list stays within the .in() filter's URL length
// limits.
const URI_BATCH_SIZE = 100;

async function getPostsInOrder(uris: string[]): Promise<Post[]> {
  if (uris.length === 0) return [];

  const batches: string[][] = [];
  for (let i = 0; i < uris.length; i += URI_BATCH_SIZE)
    batches.push(uris.slice(i, i + URI_BATCH_SIZE));
  const results = await Promise.all(
    batches.map((batch) => queryDocuments().in("uri", batch)),
  );

  const rows: DocumentRow[] = [];
  for (const { data, error } of results) {
    if (error) {
      console.error("Error fetching documents by tag:", error);
      continue;
    }
    rows.push(...(data || []));
  }

  // Deduplicate records that may exist under both pub.leaflet and site.standard namespaces
  const byUri = new Map(deduplicateByUriOrdered(rows).map((d) => [d.uri, d]));
  return toPosts(
    uris
      .map((uri) => byUri.get(uri))
      .filter((d): d is DocumentRow => !!d),
  );
}

async function toPosts(documents: DocumentRow[]): Promise<Post[]> {
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

      // Public listing with no membership context — serve only the preview of
      // members-only posts.
      const docPages = getDocumentPages(normalizedData);
      if (docPages) truncatePagesAtMembersDelimiter(docPages);

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
  return posts.filter((p): p is Post => p !== null);
}

// Resolve the tag to document uris via a function whose plan is pinned to the
// document_tags tag index. Ordering by sort_date with a limit while joining in
// one query lets the planner walk the sort_date index and probe every document
// for the tag — a full table scan for rare tags.
async function getNewestTagDocumentUris(tag: string): Promise<string[]> {
  const { data: tagged, error: tagError } = await supabaseServerClient.rpc(
    "get_tag_page_document_uris",
    { tag_query: tag, max_count: 50 },
  );
  if (!tagError) return (tagged || []).map((row) => row.uri);

  // The function ships in a migration that deploys separately from this code;
  // if it isn't there (yet), degrade to querying document_tags directly rather
  // than rendering an empty page. The cap keeps the .in() filter downstream
  // within URL length limits, so a very popular tag may miss some of its
  // newest posts until the function exists.
  console.error("Error fetching tag document uris:", tagError);
  const { data: fallback, error: fallbackError } = await supabaseServerClient
    .from("document_tags")
    .select("uri")
    .eq("tag", tag)
    .limit(200);
  if (fallbackError) {
    console.error("Error fetching documents by tag:", fallbackError);
    return [];
  }
  return (fallback || []).map((row) => row.uri);
}
