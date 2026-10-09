import { supabaseServerClient } from "supabase/serverClient";
import { inngest } from "app/api/inngest/client";
import { Ok, Err, type Result } from "src/result";
import { loadActablePublication } from "src/emailPosts/save";
import { isValidSendAt } from "src/emailPosts/types";
import { addDraftToPublication } from "src/utils/addDraftToPublication";
import {
  scheduledPostIneligibleReason,
  type ScheduledPostIneligibleReason,
} from "src/scheduledPosts/eligibility";
import {
  EDITABLE_SCHEDULED_POST_STATUSES,
  type ScheduledBskyPost,
  type ScheduledPost,
} from "src/scheduledPosts/types";
import type { Json } from "supabase/database.types";

export type SaveScheduledPostError =
  | "unauthorized"
  | ScheduledPostIneligibleReason
  | "already_published"
  | "is_email_post"
  | "invalid_publish_at"
  | "publishing"
  | "database_error";

// Schedules a publication draft to publish at `publish_at`, or reschedules
// it. Called with the signed-in actor's DID, who the post is published as.
export async function saveScheduledPost(
  args: {
    publication_uri: string;
    leaflet_id: string;
    publish_at: string;
    send_email: boolean;
    show_in_discover: boolean;
    bsky_post: ScheduledBskyPost | null;
    // Used only when the leaflet isn't a draft of the publication yet.
    // Scheduling makes it one; from then on the draft holds its own.
    title: string;
    description: string;
    tags: string[];
    entitiesToDelete: string[];
  },
  actorDid: string,
): Promise<Result<ScheduledPost, SaveScheduledPostError>> {
  const pub = await loadActablePublication(args.publication_uri, actorDid);
  if (!pub) return Err("unauthorized");

  const ineligible = await scheduledPostIneligibleReason(args.publication_uri);
  if (ineligible) return Err(ineligible);

  const publishAt = new Date(args.publish_at);
  if (!isValidSendAt(publishAt)) return Err("invalid_publish_at");

  const [{ data: drafts }, { data: existing }] = await Promise.all([
    supabaseServerClient
      .from("leaflets_in_publications")
      .select("publication, doc, email_only")
      .eq("leaflet", args.leaflet_id),
    supabaseServerClient
      .from("publication_scheduled_posts")
      .select("id, publication, revision")
      .eq("leaflet", args.leaflet_id)
      .maybeSingle(),
  ]);
  if (existing && existing.publication !== args.publication_uri)
    return Err("unauthorized");

  const draft = drafts?.find((d) => d.publication === args.publication_uri);
  if (draft?.email_only) return Err("is_email_post");
  if (draft?.doc) return Err("already_published");
  // A draft of some other publication can't be scheduled into this one.
  if (!draft && drafts?.length) return Err("unauthorized");
  if (!draft) {
    const { error } = await addDraftToPublication({
      leaflet_id: args.leaflet_id,
      publication_uri: args.publication_uri,
      actorDid,
      title: args.title,
      description: args.description,
      tags: args.tags,
      entitiesToDelete: args.entitiesToDelete,
    });
    if (error) {
      console.error("[saveScheduledPost] couldn't create draft:", error);
      return Err("database_error");
    }
  }

  const revision = (existing?.revision ?? -1) + 1;
  const row = {
    publication: args.publication_uri,
    leaflet: args.leaflet_id,
    created_by: actorDid,
    publish_at: publishAt.toISOString(),
    send_email: args.send_email,
    show_in_discover: args.show_in_discover,
    bsky_post: args.bsky_post as unknown as Json,
    status: "scheduled",
    revision,
    error: null,
    updated_at: new Date().toISOString(),
  };
  // Updates are guarded on the row still being editable, so a save can't
  // reschedule a post the publish job has just claimed.
  const { data: saved, error } = existing
    ? await supabaseServerClient
        .from("publication_scheduled_posts")
        .update(row)
        .eq("id", existing.id)
        .in("status", EDITABLE_SCHEDULED_POST_STATUSES)
        .select()
        .maybeSingle()
    : await supabaseServerClient
        .from("publication_scheduled_posts")
        .insert(row)
        .select()
        .single();
  if (error) {
    console.error("[saveScheduledPost] save failed:", error);
    return Err("database_error");
  }
  if (!saved) return Err("publishing");

  await inngest.send({
    name: "post/scheduled-publish.requested",
    data: { scheduled_post_id: saved.id, revision },
  });

  return Ok(saved as ScheduledPost);
}

// Returns a scheduled post to being a plain draft.
export async function cancelScheduledPost(
  leafletId: string,
  actorDid: string,
): Promise<Result<null, "unauthorized" | "publishing" | "database_error">> {
  const { data: existing } = await supabaseServerClient
    .from("publication_scheduled_posts")
    .select("id, publication")
    .eq("leaflet", leafletId)
    .maybeSingle();
  if (!existing) return Ok(null);
  if (!(await loadActablePublication(existing.publication, actorDid)))
    return Err("unauthorized");
  // The status guard loses a race with the publish job claiming the row, so
  // the author is never told a post that's going out was canceled.
  const { data: deleted, error } = await supabaseServerClient
    .from("publication_scheduled_posts")
    .delete()
    .eq("id", existing.id)
    .in("status", EDITABLE_SCHEDULED_POST_STATUSES)
    .select("id");
  if (error) return Err("database_error");
  if (!deleted?.length) return Err("publishing");
  return Ok(null);
}
