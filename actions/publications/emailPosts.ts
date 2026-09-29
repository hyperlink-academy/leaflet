"use server";

import { getAuthIdentity } from "src/auth";
import { Err } from "src/result";
import {
  cancelEmailPost as cancelEmailPostCore,
  saveEmailPost as saveEmailPostCore,
} from "src/emailPosts/save";
import { trackUserEvent } from "src/activeUserAnalytics";

export async function saveEmailPost(
  args: Parameters<typeof saveEmailPostCore>[0],
) {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return Err("unauthorized" as const);
  const result = await saveEmailPostCore(args, identity.atp_did);
  if (result.ok)
    trackUserEvent(identity, "send_email_post", {
      publication: args.publication_uri,
      send_mode: args.send.mode,
      audience: result.value.audience,
    });
  return result;
}

export async function cancelEmailPost(leaflet_id: string) {
  const identity = await getAuthIdentity();
  if (!identity?.atp_did) return Err("unauthorized" as const);
  return cancelEmailPostCore(leaflet_id, identity.atp_did);
}
