import { describe, expect, it, vi } from "vitest";
import type { OAuthSession } from "@atproto/oauth-client-node";
import { loggedFetchHandler } from "./loggedFetchHandler";

const session = (res: Response) =>
  ({ did: "did:plc:a", fetchHandler: async () => res }) as unknown as OAuthSession;

describe("loggedFetchHandler", () => {
  it("logs a failed response with the PDS reply and leaves it readable", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const reply = '{"error":"BlobTooLarge","message":"too big"}';
    const res = await loggedFetchHandler(
      session(
        new Response(reply, {
          status: 400,
          headers: { "ratelimit-remaining": "5", "content-type": "text/plain" },
        }),
      ),
      { leaflet_id: "l1" },
    )("/xrpc/com.atproto.repo.uploadBlob", {
      method: "post",
      body: new Blob([new Uint8Array(3)]),
    });
    expect(await res.text()).toBe(reply);
    expect(log).toHaveBeenCalledWith(
      "[pds] request failed",
      expect.objectContaining({
        leaflet_id: "l1",
        repo: "did:plc:a",
        path: "/xrpc/com.atproto.repo.uploadBlob",
        bodyBytes: 3,
        status: 400,
        response: reply,
        headers: { "ratelimit-remaining": "5" },
      }),
    );
    log.mockRestore();
  });

  it("is silent on success", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await loggedFetchHandler(session(new Response("{}")), {})(
      "/xrpc/com.atproto.repo.putRecord",
      { method: "post", body: "{}" },
    );
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
