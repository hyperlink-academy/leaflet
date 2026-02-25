"use server";

import { supabaseServerClient } from "supabase/serverClient";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import type { Post } from "app/(home-pages)/reader/getReaderFeed";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import { deduplicateByUriOrdered } from "src/utils/deduplicateRecords";

export type Cursor = {
  sort_date: string;
  uri: string;
};

export async function getProfilePosts(
  did: string,
  cursor?: Cursor | null,
): Promise<{ posts: Post[]; nextCursor: Cursor | null }> {
  const limit = 20;

  let query = supabaseServerClient
    .from("documents")
    .select(
      `*,
      comments_on_documents(count),
      document_mentions_in_bsky(count),
      recommends_on_documents(count),
      documents_in_publications(publications(*))`,
    )
    .like("uri", `at://${did}/%`)
    .order("sort_date", { ascending: false })
    .order("uri", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.or(
      `sort_date.lt.${cursor.sort_date},and(sort_date.eq.${cursor.sort_date},uri.lt.${cursor.uri})`,
    );
  }

  let [{ data: rawDocs }, { data: rawPubs }, { data: profile }] =
    await Promise.all([
      query,
      supabaseServerClient
        .from("publications")
        .select("*")
        .eq("identity_did", did),
      supabaseServerClient
        .from("bsky_profiles")
        .select("handle")
        .eq("did", did)
        .single(),
    ]);

  // Deduplicate records that may exist under both pub.leaflet and site.standard namespaces
  const docs = deduplicateByUriOrdered(rawDocs || []);
  const pubs = deduplicateByUriOrdered(rawPubs || []);

  // Build a map of publications for quick lookup
  let pubMap = new Map<string, NonNullable<typeof pubs>[number]>();
  for (let pub of pubs || []) {
    pubMap.set(pub.uri, pub);
  }

  // Transform data to Post[] format
  let handle = profile?.handle ? `@${profile.handle}` : null;
  let posts: Post[] = [];

  for (let doc of docs || []) {
    // Normalize records - filter out unrecognized formats
    const normalizedData = normalizeDocumentRecord(doc.data, doc.uri);
    if (!normalizedData) continue;

    let pubFromDoc = doc.documents_in_publications?.[0]?.publications;
    let pub = pubFromDoc ? pubMap.get(pubFromDoc.uri) || pubFromDoc : null;

    let post: Post = {
      author: handle,
      documents: {
        data: normalizedData,
        uri: doc.uri,
        sort_date: doc.sort_date,
        comments_on_documents: doc.comments_on_documents,
        document_mentions_in_bsky: doc.document_mentions_in_bsky,
        recommends_on_documents: doc.recommends_on_documents,
      },
    };

    if (pub) {
      post.publication = {
        href: getPublicationURL(pub),
        pubRecord: normalizePublicationRecord(pub.record),
        uri: pub.uri,
      };
    }

    posts.push(post);
  }

  const nextCursor =
    posts.length === limit
      ? {
          sort_date: posts[posts.length - 1].documents.sort_date,
          uri: posts[posts.length - 1].documents.uri,
        }
      : null;

  return { posts, nextCursor };
}
