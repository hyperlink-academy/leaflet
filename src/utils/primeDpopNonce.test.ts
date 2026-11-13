import { afterEach, describe, expect, it, vi } from "vitest";
import type { OAuthSession } from "@atproto/oauth-client-node";
import { primeNonceBeforeLargeUploads } from "./primeDpopNonce";

const UPLOAD = "/xrpc/com.atproto.repo.uploadBlob";
const PRIME = "/xrpc/com.atproto.server.getSession";
const big = () => new Blob([new Uint8Array(2 * 1024 * 1024)]);

function fakeSession(respond: (path: string) => Promise<Response>) {
  const calls: string[] = [];
  const session = {
    did: "did:plc:a",
    async fetchHandler(path: string) {
      calls.push(path);
      return respond(path);
    },
  } as unknown as OAuthSession;
  return { session: primeNonceBeforeLargeUploads(session), calls };
}

afterEach(() => vi.useRealTimers());

describe("primeNonceBeforeLargeUploads", () => {
  it("sends a bodiless request ahead of a large upload", async () => {
    const { session, calls } = fakeSession(async () => new Response("{}"));
    await session.fetchHandler(UPLOAD, { method: "post", body: big() });
    expect(calls).toEqual([PRIME, UPLOAD]);
  });

  it("leaves small requests alone", async () => {
    const { session, calls } = fakeSession(async () => new Response("{}"));
    await session.fetchHandler(UPLOAD, { method: "post", body: "{}" });
    await session.fetchHandler("/xrpc/com.atproto.repo.describeRepo");
    expect(calls).toEqual([UPLOAD, "/xrpc/com.atproto.repo.describeRepo"]);
  });

  it("primes again only once the nonce has had time to go stale", async () => {
    vi.useFakeTimers();
    const { session, calls } = fakeSession(async () => new Response("{}"));
    await session.fetchHandler(UPLOAD, { method: "post", body: big() });
    await session.fetchHandler(UPLOAD, { method: "post", body: big() });
    expect(calls).toEqual([PRIME, UPLOAD, UPLOAD]);
    vi.advanceTimersByTime(31_000);
    await session.fetchHandler(UPLOAD, { method: "post", body: big() });
    expect(calls).toEqual([PRIME, UPLOAD, UPLOAD, PRIME, UPLOAD]);
  });

  it("still uploads when the priming request throws", async () => {
    const { session, calls } = fakeSession(async (path) => {
      if (path === PRIME) throw new Error("network");
      return new Response("{}");
    });
    const res = await session.fetchHandler(UPLOAD, {
      method: "post",
      body: big(),
    });
    expect(res.status).toBe(200);
    expect(calls).toEqual([PRIME, UPLOAD]);
  });

  it("wraps a session only once", async () => {
    const { session, calls } = fakeSession(async () => new Response("{}"));
    primeNonceBeforeLargeUploads(session);
    await session.fetchHandler(UPLOAD, { method: "post", body: big() });
    expect(calls).toEqual([PRIME, UPLOAD]);
  });
});
