import { beforeEach, describe, expect, it, vi } from "vitest";

const { profileGet, createComment, queue, insert, getAuthIdentity } =
  vi.hoisted(() => ({
    profileGet: vi.fn(),
    createComment: vi.fn(),
    queue: vi.fn(),
    insert: vi.fn(),
    getAuthIdentity: vi.fn(),
  }));
vi.mock("lexicons/api", () => ({
  AtpBaseClient: class {
    app = { bsky: { actor: { profile: { get: profileGet } } } };
    pub = { leaflet: { comment: { create: createComment } } };
  },
}));
vi.mock("src/auth", () => ({ getAuthIdentity }));
vi.mock("src/atproto-oauth", () => ({
  restoreOAuthSession: async () => ({
    ok: true,
    value: { did: "did:plc:author", fetchHandler: vi.fn() },
  }),
}));
vi.mock("supabase/serverClient", () => ({
  supabaseServerClient: { from: () => ({ insert }) },
}));
vi.mock("src/notifications", () => ({
  pingIdentityToUpdateNotification: vi.fn(),
}));
vi.mock("src/comments/tombstoneComment", () => ({ tombstoneComment: vi.fn() }));
vi.mock("src/documentEvents/broadcast", () => ({
  broadcastDocumentEvent: vi.fn(),
}));
vi.mock("src/activeUserAnalytics", () => ({ trackUserEvent: vi.fn() }));
vi.mock("src/notificationEmails/queueToSendEmailOn", () => ({
  queueToSendEmailOn: queue,
}));
import { publishComment } from "./commentAction";

const args = {
  document: "at://did:plc:writer/site.standard.document/post",
  comment: { plaintext: "Hello!", facets: [], attachment: undefined },
};
beforeEach(() => {
  vi.clearAllMocks();
  getAuthIdentity.mockResolvedValue({
    id: "author",
    atp_did: "did:plc:author",
  });
  profileGet.mockReset();
  createComment.mockReset().mockResolvedValue({ uri: "comment-uri" });
  insert.mockImplementation(() => {
    const result = Promise.resolve({
      data: [{ record: { plaintext: "Hello!" } }],
      error: null,
    });
    return Object.assign(result, { select: () => result });
  });
});

describe("publishComment profile metadata", () => {
  it("posts and queues the comment when the account has no profile record", async () => {
    profileGet.mockRejectedValue({
      error: "RecordNotFound",
      message: "Could not locate record",
    });
    const result = await publishComment(args);
    expect(result.success).toBe(true);
    if (result.success) expect(result.profile).toBeNull();
    expect(createComment).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalled();
    expect(queue).toHaveBeenCalledWith(
      expect.objectContaining({ type: "comments" }),
    );
  });

  it("keeps display metadata when a profile exists", async () => {
    profileGet.mockResolvedValue({ value: { displayName: "Author" } });
    const result = await publishComment(args);
    expect(result.success).toBe(true);
    if (result.success)
      expect(result.profile).toEqual({ displayName: "Author" });
  });

  it("does not let an optional profile network error fail the comment", async () => {
    profileGet.mockRejectedValue(new Error("Profile lookup unavailable"));
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect((await publishComment(args)).success).toBe(true);
      expect(queue).toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it("does not insert or email a comment when its write fails", async () => {
    profileGet.mockResolvedValue({ value: {} });
    createComment.mockRejectedValue(new Error("Comment write failed"));
    await expect(publishComment(args)).rejects.toThrow("Comment write failed");
    expect(insert).not.toHaveBeenCalled();
    expect(queue).not.toHaveBeenCalled();
  });
});
