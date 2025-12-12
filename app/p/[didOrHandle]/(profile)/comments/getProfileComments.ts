"use server";

import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";
import { PubLeafletComment } from "lexicons/api";

export type Cursor = {
  indexed_at: string;
  uri: string;
};

export type ProfileComment = {
  uri: string;
  record: Json;
  indexed_at: string;
  bsky_profiles: { record: Json; handle: string | null } | null;
  document: {
    uri: string;
    data: Json;
  } | null;
  publication: {
    uri: string;
    record: Json;
  } | null;
  // For replies, include the parent comment info
  parentComment: {
    uri: string;
    record: Json;
    bsky_profiles: { record: Json; handle: string | null } | null;
  } | null;
};

export async function getProfileComments(
  did: string,
  cursor?: Cursor | null,
): Promise<{ comments: ProfileComment[]; nextCursor: Cursor | null }> {
  const limit = 20;

  let query = supabaseServerClient
    .from("comments_on_documents")
    .select(
      `*,
      bsky_profiles(record, handle),
      documents(uri, data, documents_in_publications(publications(*)))`,
    )
    .eq("profile", did)
    .order("indexed_at", { ascending: false })
    .order("uri", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.or(
      `indexed_at.lt.${cursor.indexed_at},and(indexed_at.eq.${cursor.indexed_at},uri.lt.${cursor.uri})`,
    );
  }

  const { data: rawComments } = await query;

  if (!rawComments || rawComments.length === 0) {
    return { comments: [], nextCursor: null };
  }

  // Collect parent comment URIs for replies
  const parentUris = rawComments
    .map((c) => (c.record as PubLeafletComment.Record).reply?.parent)
    .filter((uri): uri is string => !!uri);

  // Fetch parent comments if there are any replies
  let parentCommentsMap = new Map<
    string,
    {
      uri: string;
      record: Json;
      bsky_profiles: { record: Json; handle: string | null } | null;
    }
  >();

  if (parentUris.length > 0) {
    const { data: parentComments } = await supabaseServerClient
      .from("comments_on_documents")
      .select(`uri, record, bsky_profiles(record, handle)`)
      .in("uri", parentUris);

    if (parentComments) {
      for (const pc of parentComments) {
        parentCommentsMap.set(pc.uri, {
          uri: pc.uri,
          record: pc.record,
          bsky_profiles: pc.bsky_profiles,
        });
      }
    }
  }

  // Transform to ProfileComment format
  const comments: ProfileComment[] = rawComments.map((comment) => {
    const record = comment.record as PubLeafletComment.Record;
    const doc = comment.documents;
    const pub = doc?.documents_in_publications?.[0]?.publications;

    return {
      uri: comment.uri,
      record: comment.record,
      indexed_at: comment.indexed_at,
      bsky_profiles: comment.bsky_profiles,
      document: doc
        ? {
            uri: doc.uri,
            data: doc.data,
          }
        : null,
      publication: pub
        ? {
            uri: pub.uri,
            record: pub.record,
          }
        : null,
      parentComment: record.reply?.parent
        ? parentCommentsMap.get(record.reply.parent) || null
        : null,
    };
  });

  const nextCursor =
    comments.length === limit
      ? {
          indexed_at: comments[comments.length - 1].indexed_at,
          uri: comments[comments.length - 1].uri,
        }
      : null;

  return { comments, nextCursor };
}
