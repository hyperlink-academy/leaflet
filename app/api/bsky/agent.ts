import { Agent } from "@atproto/api";
import { cookies } from "next/headers";
import { restoreOAuthSession } from "src/atproto-oauth";
import { supabaseServerClient } from "supabase/serverClient";

// Unauthenticated agent against the public AppView. Use this for read-only
// public endpoints (getProfile(s), feed reads, etc.) — they need no auth, and
// routing them through an authenticated agent needlessly restores/refreshes the
// viewer's OAuth session on every render, which causes "refreshToken replayed".
export function getPublicAgent(): Agent {
  return new Agent({
    service: "https://public.api.bsky.app",
  });
}

async function getAuthenticatedAgent(): Promise<Agent | null> {
  try {
    const cookieStore = await cookies();
    const authToken =
      cookieStore.get("auth_token")?.value ||
      cookieStore.get("external_auth_token")?.value;

    if (!authToken || authToken === "null") return null;

    const { data } = await supabaseServerClient
      .from("email_auth_tokens")
      .select("identities(atp_did)")
      .eq("id", authToken)
      .eq("confirmed", true)
      .single();

    const did = data?.identities?.atp_did;
    if (!did) return null;

    // Go through restoreOAuthSession (not oauthClient.restore directly) so
    // concurrent restores for the same DID are deduped — calling restore()
    // raw lets parallel requests each replay the same refresh token.
    const session = await restoreOAuthSession(did);
    if (!session.ok) return null;
    return new Agent(session.value);
  } catch (error) {
    console.error("Failed to get authenticated agent:", error);
    return null;
  }
}

export async function getAgent(): Promise<Agent> {
  const agent = await getAuthenticatedAgent();
  if (agent) return agent;

  return getPublicAgent();
}
