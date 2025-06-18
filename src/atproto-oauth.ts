import {
  NodeOAuthClient,
  NodeSavedSession,
  NodeSavedState,
  RuntimeLock,
  Session,
} from "@atproto/oauth-client-node";
import { JoseKey } from "@atproto/jwk-jose";
import { oauth_metadata } from "app/api/oauth/[route]/oauth-metadata";
import { supabaseServerClient } from "supabase/serverClient";

import { Redis } from "@upstash/redis";
import Redlock from "redlock";
export async function createOauthClient() {
  let keyset =
    process.env.NODE_ENV === "production"
      ? await Promise.all([
          JoseKey.fromImportable(process.env.JOSE_PRIVATE_KEY_1!),
        ])
      : undefined;
  let requestLock: RuntimeLock | undefined;
  if (
    process.env.NODE_ENV === "production" &&
    process.env.KV_REST_API_URL &&
    process.env.KV_REST_API_TOKEN
  ) {
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    const redlock = new Redlock([redis]);
    requestLock = async (key, fn) => {
      // 30 seconds should be enough. Since we will be using one lock per user id
      // we can be quite liberal with the lock duration here.
      const lock = await redlock.acquire([key], 45e3);
      try {
        return await fn();
      } finally {
        await lock.release();
      }
    };
  }
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
    requestLock,
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
