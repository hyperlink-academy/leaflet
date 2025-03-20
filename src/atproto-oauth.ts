import {
  NodeOAuthClient,
  NodeSavedSession,
  NodeSavedState,
  Session,
} from "@atproto/oauth-client-node";
import { JoseKey } from "@atproto/jwk-jose";
import { oauth_metadata } from "app/api/oauth/[route]/route";
import { supabaseServerClient } from "supabase/serverClient";

export async function createOauthClient() {
  let keyset =
    process.env.NODE_ENV === "production"
      ? await Promise.all([
          JoseKey.fromImportable(process.env.JOSE_PRIVATE_KEY_1!),
        ])
      : undefined;
  return new NodeOAuthClient({
    // This object will be used to build the payload of the /client-metadata.json
    // endpoint metadata, exposing the client metadata to the OAuth server.
    clientMetadata: oauth_metadata,

    // Used to authenticate the client to the token endpoint. Will be used to
    // build the jwks object to be exposed on the "jwks_uri" endpoint.
    keyset,

    // Interface to store authorization state data (during authorization flows)
    stateStore,
    // Interface to store authenticated session data
    sessionStore,
  });
}

let stateStore = {
  async set(key: string, state: NodeSavedState): Promise<void> {
    await supabaseServerClient.from("oauth_state_store").upsert({ key, state });
  },
  async get(key: string): Promise<NodeSavedState | undefined> {
    let { data } = await supabaseServerClient
      .from("oauth_state_store")
      .select("state")
      .eq("key", key)
      .single();
    return (data?.state as NodeSavedState) || undefined;
  },
  async del(key: string): Promise<void> {
    await supabaseServerClient
      .from("oauth_state_store")
      .delete()
      .eq("key", key);
  },
};

let sessionStore = {
  async set(key: string, session: NodeSavedSession): Promise<void> {
    await supabaseServerClient
      .from("oauth_session_store")
      .upsert({ key, session });
  },
  async get(key: string): Promise<NodeSavedSession | undefined> {
    let { data } = await supabaseServerClient
      .from("oauth_session_store")
      .select("session")
      .eq("key", key)
      .single();
    return (data?.session as NodeSavedSession) || undefined;
  },
  async del(key: string): Promise<void> {
    await supabaseServerClient
      .from("oauth_session_store")
      .delete()
      .eq("key", key);
  },
};
