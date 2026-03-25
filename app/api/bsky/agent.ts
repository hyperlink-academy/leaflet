import { Agent } from "@atproto/api";
import { createOauthClient } from "src/atproto-oauth";
import { getAuthToken } from "src/auth";
import { supabaseServerClient } from "supabase/serverClient";

export async function getAuthenticatedAgent(): Promise<Agent | null> {
  try {
    const authToken = await getAuthToken();

    if (!authToken || authToken === "null") return null;

    const { data } = await supabaseServerClient
      .from("email_auth_tokens")
      .select("identities(atp_did)")
      .eq("id", authToken)
      .eq("confirmed", true)
      .single();

    const did = data?.identities?.atp_did;
    if (!did) return null;

    const oauthClient = await createOauthClient();
    const session = await oauthClient.restore(did);
    return new Agent(session);
  } catch (error) {
    console.error("Failed to get authenticated agent:", error);
    return null;
  }
}

export async function getAgent(): Promise<Agent> {
  const agent = await getAuthenticatedAgent();
  if (agent) return agent;

  return new Agent({
    service: "https://public.api.bsky.app",
  });
}
