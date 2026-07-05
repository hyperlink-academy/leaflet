"use server";

import { supabaseServerClient } from "supabase/serverClient";
import { getProfiles } from "src/identity";
import { attachBylineProfiles, bylineDidsForPosts } from "src/utils/byline";
import {
  buildPublicationPosts,
  type PublicationPostsListPost,
} from "./buildPublicationPosts";

/**
 * Hydrates a batch of document URIs into renderable posts (counts + bylines
 * resolved), preserving the requested order. The reusable primitive behind
 * posts-list pagination: callers decide how the URI list is ordered/filtered,
 * this just turns a page of URIs into post data.
 */
export async function getPostsByUris(
  uris: string[],
): Promise<PublicationPostsListPost[]> {
  if (uris.length === 0) return [];

  const { data, error } = await supabaseServerClient
    .from("documents")
    .select(
      `uri, data,
       comments_on_documents(count),
       document_mentions_in_bsky(count),
       recommends_on_documents(count),
       documents_in_publications(members_only)`,
    )
    .in("uri", uris);

  if (error) {
    console.error("[getPostsByUris] query error:", error);
    return [];
  }

  const posts = buildPublicationPosts(
    (data ?? []).map(({ documents_in_publications, ...documents }) => ({
      members_only: documents_in_publications?.[0]?.members_only,
      documents,
    })),
  );
  const withByline = attachBylineProfiles(
    posts,
    await getProfiles(bylineDidsForPosts(posts)),
  );

  // `in` doesn't preserve order; reorder to match the requested batch.
  const byUri = new Map(withByline.map((p) => [p.uri, p]));
  return uris
    .map((uri) => byUri.get(uri))
    .filter((p): p is (typeof withByline)[number] => p !== undefined);
}
