import type { FetchHandler } from "@atproto/xrpc";
import type { OAuthSession } from "@atproto/oauth-client-node";
import { bodyBytes } from "src/utils/primeDpopNonce";

// Rate limiting, DPoP nonce churn, and the PDS's own request correlation ids.
const HEADERS_TO_LOG =
  /^(ratelimit-|retry-after|dpop-nonce|www-authenticate|x-request-id|cf-ray)/;

// Wraps a session's fetch handler so every PDS call that fails (non-2xx or a
// transport error) logs one line with what's needed to reproduce it: which
// XRPC method, payload size, duration, and what the PDS answered. `context`
// is whatever identifies the flow (leaflet id, publication uri, actor).
export function loggedFetchHandler(
  session: OAuthSession,
  context: Record<string, string | undefined>,
): FetchHandler {
  return async (url, init) => {
    const started = Date.now();
    const body = init?.body;
    const details = () => ({
      ...context,
      repo: session.did,
      path: url,
      bodyBytes: bodyBytes(body),
      durationMs: Date.now() - started,
    });
    let res: Response;
    try {
      res = await session.fetchHandler(url, init);
    } catch (e) {
      console.error("[pds] request threw", {
        ...details(),
        // No response to read the host from, and it's the one field that
        // tells one PDS implementation's behaviour apart from another's.
        pds: await session
          .getTokenInfo(false)
          .then((t) => t.aud)
          .catch(() => undefined),
        error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      });
      throw e;
    }
    if (!res.ok)
      console.error("[pds] request failed", {
        ...details(),
        pds: res.url,
        status: res.status,
        response: await res.clone().text(),
        headers: Object.fromEntries(
          [...res.headers].filter(([k]) => HEADERS_TO_LOG.test(k)),
        ),
      });
    return res;
  };
}
