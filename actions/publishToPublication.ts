"use server";

import { getAuthIdentity } from "src/auth";
import {
  publishLeaflet,
  type PublishLeafletArgs,
  type PublishResult,
} from "src/utils/publishLeaflet";

// The rkey is server-chosen here: a caller-supplied one could target an
// existing record in the publication owner's repo. Only trusted server-side
// callers (the Ghost importer) pass one to publishLeaflet directly.
export async function publishToPublication(
  args: Omit<PublishLeafletArgs, "rkey">,
): Promise<PublishResult> {
  let identity = await getAuthIdentity();
  if (!identity || !identity.atp_did) {
    return {
      success: false,
      error: {
        type: "oauth_session_expired",
        message: "Not authenticated",
        did: "",
      },
    };
  }
  let { rkey: _ignored, ...safeArgs } = args as PublishLeafletArgs;
  return publishLeaflet({ ...safeArgs, actorDid: identity.atp_did });
}
