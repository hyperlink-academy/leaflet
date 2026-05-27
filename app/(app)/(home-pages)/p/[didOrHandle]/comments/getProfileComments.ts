"use server";

import { supabaseServerClient } from "supabase/serverClient";
import { Json } from "supabase/database.types";
import { PubLeafletComment } from "lexicons/api";
import { AtUri } from "@atproto/syntax";
import { getProfiles, type Profile } from "src/identity";

export type Cursor = {
  indexed_at: string;
  uri: string;
};

export type CommentProfile = Pick<
  Profile,
  "did" | "handle" | "displayName" | "avatar"
>;

export type ProfileComment = {
  uri: string;
  record: Json;
  indexed_at: string;
  profile: CommentProfile | null;
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
    profile: CommentProfile | null;
  } | null;
};

function toCommentProfile(p: Profile | null | undefined): CommentProfile | null {
  if (!p) return null;
  return {
    did: p.did,
    handle: p.handle,
    displayName: p.displayName,
    avatar: p.avatar,
  };
}

export async function getProfileComments(
  did: string,
  cursor?: Cursor | null,
): Promise<{ comments: ProfileComment[]; nextCursor: Cursor | null }> {
  const limit = 20;

  let query = supabaseServerClient
    .from("comments_on_documents")
    .select(
      `*,
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
    { uri: string; record: Json }
  >();

  if (parentUris.length > 0) {
    const { data: parentComments } = await supabaseServerClient
      .from("comments_on_documents")
      .select("uri, record")
      .in("uri", parentUris);

    if (parentComments) {
      for (const pc of parentComments) {
        parentCommentsMap.set(pc.uri, { uri: pc.uri, record: pc.record });
      }
    }
  }

  // Gather all author DIDs from both main and parent comments
  const allDids = new Set<string>();
  for (const c of rawComments) allDids.add(new AtUri(c.uri).host);
  for (const pc of parentCommentsMap.values())
    allDids.add(new AtUri(pc.uri).host);

  const profiles = await getProfiles(Array.from(allDids));

  // Transform to ProfileComment format
  const comments: ProfileComment[] = rawComments.map((comment) => {
    const record = comment.record as PubLeafletComment.Record;
    const doc = comment.documents;
    const pub = doc?.documents_in_publications?.[0]?.publications;
    const commenterDid = new AtUri(comment.uri).host;

    const parentRaw = record.reply?.parent
      ? parentCommentsMap.get(record.reply.parent)
      : undefined;
    const parentDid = parentRaw ? new AtUri(parentRaw.uri).host : null;

    return {
      uri: comment.uri,
      record: comment.record,
      indexed_at: comment.indexed_at,
      profile: toCommentProfile(profiles.get(commenterDid)),
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
      parentComment: parentRaw
        ? {
            uri: parentRaw.uri,
            record: parentRaw.record,
            profile: parentDid
              ? toCommentProfile(profiles.get(parentDid))
              : null,
          }
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
