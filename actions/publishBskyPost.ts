"use server";

import { getAuthIdentity } from "src/auth";
import {
  postDocumentToBsky,
  postPublicationShareToBsky,
  type PostDocumentToBskyArgs,
  type PostPublicationShareToBskyArgs,
  type PublishBskyResult,
} from "src/utils/publishBskyPost";

const notAuthenticated: PublishBskyResult = {
  success: false,
  error: {
    type: "oauth_session_expired",
    message: "Not authenticated",
    did: "",
  },
};

export async function publishPostToBsky(
  args: PostDocumentToBskyArgs,
): Promise<PublishBskyResult> {
  let identity = await getAuthIdentity();
  if (!identity?.atp_did) return notAuthenticated;
  return postDocumentToBsky(identity.atp_did, args);
}

export async function publishPublicationShareToBsky(
  args: PostPublicationShareToBskyArgs,
): Promise<PublishBskyResult> {
  let identity = await getAuthIdentity();
  if (!identity?.atp_did) return notAuthenticated;
  return postPublicationShareToBsky(identity.atp_did, args);
}
