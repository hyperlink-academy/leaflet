"use server";

import { getAuthIdentity } from "src/auth";
import {
  publishPublicationPages as publishPages,
  type PublishPagesResult,
} from "src/utils/publishPublicationPages";

export async function publishPublicationPages(args: {
  publication_uri: string;
}): Promise<PublishPagesResult> {
  const identity = await getAuthIdentity();
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
  return publishPages({ ...args, actorDid: identity.atp_did });
}
