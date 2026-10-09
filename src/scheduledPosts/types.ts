import type { AppBskyRichtextFacet } from "@atproto/api";
import type { Database } from "supabase/database.types";

// scheduled → publishing, after which the row is gone: a published post is
// just a post. A publish that can't go through leaves the row failed, or
// paused when the publication's owner no longer has Pro, until the author
// reschedules or cancels.
export type ScheduledPostStatus =
  | "scheduled"
  | "publishing"
  | "failed"
  | "paused";

// The Bluesky post to share the published post with, composed at schedule time.
export type ScheduledBskyPost = {
  text: string;
  facets: AppBskyRichtextFacet.Main[];
  langs?: string[];
};

export type ScheduledPost = Omit<
  Database["public"]["Tables"]["publication_scheduled_posts"]["Row"],
  "status" | "bsky_post"
> & {
  status: ScheduledPostStatus;
  bsky_post: ScheduledBskyPost | null;
};

// Statuses the author can still reschedule or cancel from; a post that's
// publishing is left to finish.
export const EDITABLE_SCHEDULED_POST_STATUSES: ScheduledPostStatus[] = [
  "scheduled",
  "paused",
  "failed",
];

// A post whose time has come is on its way out, even in the moments before
// the publish job claims it and its status still reads scheduled.
export function isScheduledPostPublishing(
  post: Pick<ScheduledPost, "status" | "publish_at">,
  now: number,
) {
  if (post.status === "publishing") return true;
  return (
    post.status === "scheduled" && new Date(post.publish_at).getTime() <= now
  );
}

// Why a paused or failed post didn't publish; `error` holds the reason.
export function scheduledPostProblem(
  post: Pick<ScheduledPost, "status" | "error">,
) {
  if (post.status === "paused")
    return "The publication's owner no longer has Leaflet Pro, so this post wasn't published.";
  if (post.status !== "failed") return null;
  if (post.error === "oauth_session_expired")
    return "The publication's owner was signed out when this post was due, so it wasn't published. They'll need to sign in again.";
  return "Something went wrong publishing this post when it was due.";
}
