import type { OAuthSession } from "@atproto/oauth-client-node";

// A PDS rejects a request whose DPoP nonce is missing or stale before reading
// the body, and the OAuth client recovers by retrying with the nonce carried
// on that 401. Over HTTP/2 the rejection of a body that is still uploading
// reaches us as a thrown stream error rather than a response (from roughly
// 12MB against Bluesky's PDSs), so there is no 401 to take a nonce from and
// nothing is retried. A bodiless request sent first moves the nonce exchange,
// and any token refresh, onto a request that can't fail that way.
const LARGE_BODY_BYTES = 1024 * 1024;

// The client's nonce cache forgets an origin after 60s.
const NONCE_FRESH_MS = 30_000;

const PRIMING_PATH = "/xrpc/com.atproto.server.getSession";

export function bodyBytes(body: unknown): number | undefined {
  if (typeof body === "string") return Buffer.byteLength(body);
  if (body instanceof Blob) return body.size;
  if (body instanceof ArrayBuffer || ArrayBuffer.isView(body))
    return body.byteLength;
  return undefined;
}

const primed = new WeakSet<OAuthSession>();

export function primeNonceBeforeLargeUploads(
  session: OAuthSession,
): OAuthSession {
  if (primed.has(session)) return session;
  primed.add(session);

  const send = session.fetchHandler.bind(session);
  let lastResponseAt = 0;
  const tracked: typeof send = async (pathname, init) => {
    const res = await send(pathname, init);
    lastResponseAt = Date.now();
    return res;
  };

  session.fetchHandler = async (pathname, init) => {
    const body = init?.body;
    // A body of unknown length is a stream, which can't be replayed either.
    const large =
      body != null && (bodyBytes(body) ?? Infinity) >= LARGE_BODY_BYTES;
    if (large && Date.now() - lastResponseAt > NONCE_FRESH_MS)
      await tracked(PRIMING_PATH).then(
        (res) => res.body?.cancel(),
        () => {},
      );
    return tracked(pathname, init);
  };
  return session;
}
