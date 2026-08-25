"use server";

import { getAuthIdentity } from "src/auth";
import {
  publishLeaflet,
  type PublishLeafletArgs,
  type PublishResult,
} from "src/utils/publishLeaflet";

export async function publishToPublication(
  args: PublishLeafletArgs,
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
  return publishLeaflet({ ...args, actorDid: identity.atp_did });
}
