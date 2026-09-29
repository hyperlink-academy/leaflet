import { inngest, events } from "../client";
import { supabaseServerClient } from "supabase/serverClient";
import { scheduledPostIneligibleReason } from "src/scheduledPosts/eligibility";
import {
  publishScheduledPost,
  shareScheduledPostOnBluesky,
} from "src/scheduledPosts/publish";
import type { ScheduledPost } from "src/scheduledPosts/types";
import type { RunStep } from "src/emailPosts/broadcast";
import { recordUserEvent } from "src/activeUserAnalytics";

async function markFailed(scheduledPostId: string, error: string) {
  await supabaseServerClient
    .from("publication_scheduled_posts")
    .update({ status: "failed", error: error.slice(0, 500) })
    .eq("id", scheduledPostId)
    .eq("status", "publishing");
}

// Publishes a scheduled post at its publish_at. Guarded by revision the same
// way send_email_post is: every save requests a new run, and a run publishes
// only if its revision is still current when it wakes. A canceled post's row
// is gone, as is that of a post the author published by hand in the meantime.
export const publish_scheduled_post = inngest.createFunction(
  {
    id: "publish_scheduled_post",
    onFailure: async ({ event, error }) => {
      await markFailed(
        event.data.event.data.scheduled_post_id,
        String(error?.message ?? error),
      );
    },
    triggers: [events.postScheduledPublishRequested],
  },
  async ({ event, step }) => {
    const { scheduled_post_id, revision } = event.data;
    const run: RunStep = (id, fn) => step.run(id, fn) as Promise<any>;

    const scheduled = await run("load-schedule", async () => {
      const { data } = await supabaseServerClient
        .from("publication_scheduled_posts")
        .select("publication, status, revision, publish_at")
        .eq("id", scheduled_post_id)
        .maybeSingle();
      return data;
    });
    if (
      !scheduled ||
      scheduled.revision !== revision ||
      scheduled.status !== "scheduled"
    )
      return { skipped: "superseded" };

    if (new Date(scheduled.publish_at) > new Date())
      await step.sleepUntil("wait-for-publish-at", scheduled.publish_at);

    const post = await run("claim", async (): Promise<ScheduledPost | null> => {
      const ineligible = await scheduledPostIneligibleReason(
        scheduled.publication,
      );
      const { data: claimed } = await supabaseServerClient
        .from("publication_scheduled_posts")
        .update(
          ineligible
            ? { status: "paused", error: ineligible }
            : { status: "publishing", error: null },
        )
        .eq("id", scheduled_post_id)
        .eq("revision", revision)
        .eq("status", "scheduled")
        .select()
        .maybeSingle();
      return ineligible ? null : (claimed as ScheduledPost | null);
    });
    if (!post) return { skipped: "superseded_or_paused" };

    const published = await run("publish", () => publishScheduledPost(post));
    if ("error" in published) {
      await run("mark-failed", () => markFailed(post.id, published.error));
      return published;
    }

    await run("track-publish", async () => {
      const { data: author } = await supabaseServerClient
        .from("identities")
        .select("id, atp_did")
        .eq("atp_did", post.created_by)
        .maybeSingle();
      if (!author) return;
      await recordUserEvent(author, "publish", {
        publication: post.publication,
        document: published.uri,
        first_publish: String(published.firstPublish),
        blocks: String(published.blocks),
        scheduled: "true",
      });
    });

    const bskyPost = post.bsky_post;
    const shared = bskyPost
      ? await run("share-on-bluesky", () =>
          shareScheduledPostOnBluesky(post, bskyPost, published),
        )
      : null;

    return { published: published.url, shared };
  },
);
