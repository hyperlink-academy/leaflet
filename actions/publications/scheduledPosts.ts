"use server";

import { getAuthIdentity } from "src/auth";
import { Err } from "src/result";
import {
  cancelScheduledPost as cancelScheduledPostCore,
  saveScheduledPost as saveScheduledPostCore,
} from "src/scheduledPosts/save";
import { trackUserEvent } from "src/activeUserAnalytics";

export async function saveScheduledPost(
  args: Parameters<typeof saveScheduledPostCore>[0],
) {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return Err("unauthorized" as const);
  const result = await saveScheduledPostCore(args, identity.atp_did);
  if (result.ok)
    trackUserEvent(identity, "schedule_post", {
      publication: args.publication_uri,
      publish_at: result.value.publish_at,
      first_schedule: String(result.value.revision === 0),
    });
  return result;
}

export async function cancelScheduledPost(leaflet_id: string) {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return Err("unauthorized" as const);
  return cancelScheduledPostCore(leaflet_id, identity.atp_did);
}
