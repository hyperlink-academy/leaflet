import { supabaseServerClient } from "supabase/serverClient";
import { publishLeaflet } from "src/utils/publishLeaflet";
import { postDocumentToBsky } from "src/utils/publishBskyPost";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { getBasePublicationURL } from "src/utils/getPublicationURL";
import type { SiteStandardDocument } from "lexicons/api";
import type { ScheduledPost } from "src/scheduledPosts/types";

export type PublishedScheduledPost = {
  rkey: string;
  uri: string;
  url: string;
  firstPublish: boolean;
  blocks: number;
  ownerDid: string;
  record: SiteStandardDocument.Record;
};

// Publishes a scheduled post's draft as it stands now, as the author who
// scheduled it. Returns an `error` for a failure that retrying won't fix and
// throws for one it might.
export async function publishScheduledPost(
  post: ScheduledPost,
): Promise<{ error: string } | PublishedScheduledPost> {
  const { data: draft } = await supabaseServerClient
    .from("leaflets_in_publications")
    .select(
      "title, description, tags, permission_tokens(root_entity), publications!leaflets_in_publications_publication_fkey(uri, identity_did, record)",
    )
    .eq("publication", post.publication)
    .eq("leaflet", post.leaflet)
    .maybeSingle();
  const rootEntity = draft?.permission_tokens?.root_entity;
  const pub = draft?.publications;
  if (!draft || !rootEntity || !pub) return { error: "draft_missing" };

  const result = await publishLeaflet({
    actorDid: post.created_by,
    root_entity: rootEntity,
    publication_uri: post.publication,
    leaflet_id: post.leaflet,
    title: draft.title,
    description: draft.description,
    tags: draft.tags ?? [],
    publishedAt: post.publish_at,
    sendEmail: post.send_email,
    showInDiscover: post.show_in_discover,
  });
  if (!result.success) {
    if (result.error.type === "oauth_session_expired")
      return { error: result.error.type };
    throw new Error(`${result.error.type}: ${result.error.message}`);
  }

  const base =
    normalizePublicationRecord(pub.record)?.url ??
    `https://leaflet.pub${getBasePublicationURL(pub)}`;
  return {
    rkey: result.rkey,
    uri: result.uri,
    firstPublish: result.firstPublish,
    blocks: result.blocks,
    url: `${base.replace(/\/+$/, "")}/${result.rkey}`,
    ownerDid: pub.identity_did,
    record: result.record,
  };
}

// Never throws: by now the post is published, and a share that didn't go out
// shouldn't report the publish as failed or be retried into a second post.
export async function shareScheduledPostOnBluesky(
  post: Pick<ScheduledPost, "id" | "created_by">,
  bskyPost: NonNullable<ScheduledPost["bsky_post"]>,
  published: PublishedScheduledPost,
) {
  try {
    const result = await postDocumentToBsky(post.created_by, {
      text: bskyPost.text,
      facets: bskyPost.facets,
      langs: bskyPost.langs,
      url: published.url,
      document_record: published.record,
      rkey: published.rkey,
      ownerDid: published.ownerDid,
    });
    if (result.success) return { uri: result.uri };
    console.error("[scheduled-post] bluesky share failed", {
      scheduled_post: post.id,
      error: result.error,
    });
    return { error: result.error.type };
  } catch (e) {
    console.error("[scheduled-post] bluesky share threw", {
      scheduled_post: post.id,
      error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
    });
    return { error: "share_failed" };
  }
}
