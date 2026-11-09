import { beforeEach, describe, expect, it, vi } from "vitest";
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("app/api/inngest/client", () => ({ inngest: { send } }));
import { queueToSendEmailOn } from "./queueToSendEmailOn";

beforeEach(() => {
  vi.clearAllMocks();
  send.mockResolvedValue({ ids: [] });
});
describe("queueToSendEmailOn", () => {
  it("uses the same event id from the action and indexer", async () => {
    const comment = "at://did:plc:reader/pub.leaflet.comment/one";
    await queueToSendEmailOn({ type: "comments", subjectUri: comment });
    await queueToSendEmailOn({ type: "comments", subjectUri: comment });
    expect(send.mock.calls[0]).toEqual(send.mock.calls[1]);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "notifications/email.requested",
        data: { type: "comments", subjectUri: comment },
      }),
    );
    await queueToSendEmailOn({
      type: "comments",
      subjectUri: "at://did:plc:reader/pub.leaflet.comment/two",
    });
    expect(send.mock.calls[2][0].id).not.toBe(send.mock.calls[0][0].id);
  });
  it("does not break comment publication if the queue is unavailable", async () => {
    send.mockRejectedValueOnce(new Error("Offline"));
    const log = vi.spyOn(console, "error").mockImplementation(() => { });
    try {
      await expect(
        queueToSendEmailOn({
          type: "comments",
          subjectUri: "at://did:plc:reader/pub.leaflet.comment/one",
        }),
      ).resolves.toBeUndefined();
    } finally {
      log.mockRestore();
    }
  });
});
