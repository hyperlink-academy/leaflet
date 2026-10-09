import { AtpBaseClient } from "lexicons/api";
import { restoreOAuthSession, type OAuthSessionError } from "src/atproto-oauth";
import { Ok } from "src/result";

export const notAuthenticated: OAuthSessionError = {
  type: "oauth_session_expired",
  message: "Not authenticated",
  did: "",
};

// A client for the repo's restored OAuth session.
export async function agentFor(did: string) {
  const sessionResult = await restoreOAuthSession(did);
  if (!sessionResult.ok) return sessionResult;
  const session = sessionResult.value;
  return Ok(new AtpBaseClient(session.fetchHandler.bind(session)));
}
