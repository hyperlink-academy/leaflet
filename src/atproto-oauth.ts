import {
  NodeOAuthClient,
  NodeSavedSession,
  NodeSavedState,
  RuntimeLock,
  OAuthSession,
  DidCache,
} from "@atproto/oauth-client-node";
import { JoseKey } from "@atproto/jwk-jose";
import {
  oauth_metadata,
  oauth_store_key_prefix,
} from "app/api/oauth/[route]/oauth-metadata";
import { supabaseServerClient } from "supabase/serverClient";

import Client from "ioredis";
import Redlock from "redlock";
import { Result, Ok, Err } from "./result";

// Flattens the library's nested error chain (TokenRefreshError → cause
// OAuthResponseError → PDS payload) into one loggable object. The PDS's
// error_description and the URL it came from are the only fields that tell a
// PDS-side rejection apart from a missing row or a network fault.
export function describeOAuthError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { error };
  const out: Record<string, unknown> = {
    name: error.name,
    message: error.message,
  };
  const e = error as Error & {
    status?: number;
    error?: string;
    errorDescription?: string;
    response?: { url?: string };
    cause?: unknown;
  };
  if (e.status !== undefined) out.status = e.status;
  if (e.error !== undefined) out.oauthError = e.error;
  if (e.errorDescription !== undefined) out.errorDescription = e.errorDescription;
  if (e.response?.url) out.url = e.response.url;
  if (e.cause !== undefined) out.cause = describeOAuthError(e.cause);
  return out;
}

// Module-scoped singleton: NodeOAuthClient, ioredis connection, and Redlock
// have no per-request state — keys/stores live above the user — so building
// them once per Node instance avoids reconnect + keyset re-import on every call.
// Stashed on globalThis so Next.js dev hot-reload doesn't leak Redis sockets.
const globalForOauth = globalThis as unknown as {
  __oauthClient?: Promise<NodeOAuthClient>;
};

export function createOauthClient(): Promise<NodeOAuthClient> {
  if (!globalForOauth.__oauthClient) {
    globalForOauth.__oauthClient = buildOauthClient();
  }
  return globalForOauth.__oauthClient;
}

// The client's DID→document cache maps a DID to its PDS, and its only reader
// is authorize() — token refresh re-resolves with noCache — so caching here
// buys nothing but the risk of building a login redirect against a PDS the
// user has migrated away from (the library default caches for 1h in memory).
// Logins are rare; resolve fresh every time.
const noDidCache: DidCache = {
  get: () => undefined,
  set: () => {},
  del: () => {},
};

async function buildOauthClient(): Promise<NodeOAuthClient> {
  let keyset =
    process.env.NODE_ENV === "production"
      ? await Promise.all([
          JoseKey.fromImportable(process.env.JOSE_PRIVATE_KEY_1!),
        ])
      : undefined;
  let requestLock: RuntimeLock | undefined;
  if (process.env.NODE_ENV === "production" && process.env.REDIS_URL) {
    const client = new Client(process.env.REDIS_URL);
    const redlock = new Redlock([client]);
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

    didCache: noDidCache,

    // The only place every session deletion passes through — including
    // refreshes that fail inside a session's fetch handler after a 401, which
    // never reach restoreOAuthSession's logger.
    onDelete: (sub, cause) => {
      console.error("[oauth] session deleted", {
        did: sub,
        ...describeOAuthError(cause),
      });
    },
    onUpdate: (sub, session) => {
      console.log("[oauth] session refreshed", {
        did: sub,
        iss: session.tokenSet.iss,
        expires_at: session.tokenSet.expires_at,
      });
    },
  });
}

const storeKey = (key: string) => oauth_store_key_prefix + key;

// The library swallows store errors (a failed write is reported later as
// "session deleted by another process"), so they have to be logged here.
const logStoreError = (
  op: string,
  key: string,
  error: { message: string; code?: string } | null,
) => {
  if (error)
    console.error(`[oauth] store ${op} failed`, {
      key,
      code: error.code,
      message: error.message,
    });
};

let stateStore = {
  async set(key: string, state: NodeSavedState): Promise<void> {
    const { error } = await supabaseServerClient
      .from("oauth_state_store")
      .upsert({ key: storeKey(key), state });
    logStoreError("state.set", key, error);
  },
  async get(key: string): Promise<NodeSavedState | undefined> {
    let { data, error } = await supabaseServerClient
      .from("oauth_state_store")
      .select("state")
      .eq("key", storeKey(key))
      .maybeSingle();
    logStoreError("state.get", key, error);
    return (data?.state as NodeSavedState) || undefined;
  },
  async del(key: string): Promise<void> {
    const { error } = await supabaseServerClient
      .from("oauth_state_store")
      .delete()
      .eq("key", storeKey(key));
    logStoreError("state.del", key, error);
  },
};

let sessionStore = {
  async set(key: string, session: NodeSavedSession): Promise<void> {
    const { error } = await supabaseServerClient
      .from("oauth_session_store")
      .upsert({ key: storeKey(key), session });
    logStoreError("session.set", key, error);
  },
  async get(key: string): Promise<NodeSavedSession | undefined> {
    let { data, error } = await supabaseServerClient
      .from("oauth_session_store")
      .select("session")
      .eq("key", storeKey(key))
      .maybeSingle();
    logStoreError("session.get", key, error);
    return (data?.session as NodeSavedSession) || undefined;
  },
  async del(key: string): Promise<void> {
    const { error } = await supabaseServerClient
      .from("oauth_session_store")
      .delete()
      .eq("key", storeKey(key));
    logStoreError("session.del", key, error);
  },
};

export type OAuthSessionError = {
  type: "oauth_session_expired";
  message: string;
  did: string;
};

// In-process dedupe: collapse concurrent restore() calls for the same DID into
// one underlying restore + Redlock acquisition. Successful entries linger
// briefly so a burst of requests (e.g. hover-fired ProfilePopovers) share one
// result; rejected promises evict immediately so a transient failure doesn't
// stick around poisoning subsequent calls.
const RESTORE_DEDUPE_TTL_MS = 5_000;
const inFlightRestores = new Map<string, Promise<OAuthSession>>();

function dedupedRestore(did: string): Promise<OAuthSession> {
  let existing = inFlightRestores.get(did);
  if (existing) return existing;

  const promise = (async () => {
    const oauthClient = await createOauthClient();
    return oauthClient.restore(did);
  })();
  inFlightRestores.set(did, promise);

  promise.then(
    () => {
      setTimeout(() => {
        if (inFlightRestores.get(did) === promise) {
          inFlightRestores.delete(did);
        }
      }, RESTORE_DEDUPE_TTL_MS);
    },
    () => {
      if (inFlightRestores.get(did) === promise) {
        inFlightRestores.delete(did);
      }
    },
  );

  return promise;
}

export async function restoreOAuthSession(
  did: string,
): Promise<Result<OAuthSession, OAuthSessionError>> {
  try {
    const session = await dedupedRestore(did);
    return Ok(session);
  } catch (error) {
    // The caller only gets "expired"; the real reason (no stored session,
    // refresh rejected, token revoked) is only visible here.
    console.error("[oauth] restore session failed", {
      did,
      ...describeOAuthError(error),
    });
    return Err({
      type: "oauth_session_expired",
      message:
        error instanceof Error
          ? error.message
          : "OAuth session expired or invalid",
      did,
    });
  }
}
