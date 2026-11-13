import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "supabase/database.types";
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("app/api/inngest/client", () => ({ inngest: { send } }));
import { enqueueEmailNotification } from "./enqueueEmailNotification";

const rpc = vi.fn();
const db = { rpc } as unknown as SupabaseClient<Database>;
const comment = "at://did:plc:reader/pub.leaflet.comment/one";

beforeEach(() => {
  vi.clearAllMocks();
  send.mockResolvedValue({ ids: [] });
  rpc.mockResolvedValue({ data: true, error: null });
});
describe("enqueueEmailNotification", () => {
  it("uses the same event id from the action and indexer", async () => {
    await enqueueEmailNotification(
      { type: "comments", subjectUri: comment },
      db,
    );
    await enqueueEmailNotification(
      { type: "comments", subjectUri: comment },
      db,
    );
    expect(send.mock.calls[0]).toEqual(send.mock.calls[1]);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "notifications/email.requested",
        data: { type: "comments", subjectUri: comment },
      }),
    );
    await enqueueEmailNotification(
      {
        type: "comments",
        subjectUri: "at://did:plc:reader/pub.leaflet.comment/two",
      },
      db,
    );
    expect(send.mock.calls[2][0].id).not.toBe(send.mock.calls[0][0].id);
  });

  it("checks the comment's publication for an opt-in", async () => {
    await enqueueEmailNotification(
      { type: "comments", subjectUri: comment },
      db,
    );
    expect(rpc).toHaveBeenCalledWith("has_comment_email_recipients", {
      p_comment_uri: comment,
    });
  });

  it("does not queue when nobody opted in", async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null });
    await enqueueEmailNotification(
      { type: "comments", subjectUri: comment },
      db,
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("queues anyway when the opt-in check fails", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "down" } });
    await enqueueEmailNotification(
      { type: "comments", subjectUri: comment },
      db,
    );
    expect(send).toHaveBeenCalledTimes(1);
    rpc.mockRejectedValueOnce(new Error("network"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await enqueueEmailNotification(
        { type: "comments", subjectUri: comment },
        db,
      );
    } finally {
      log.mockRestore();
    }
  });

  it("does not break comment publication if the queue is unavailable", async () => {
    send.mockRejectedValueOnce(new Error("Offline"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(
        enqueueEmailNotification({ type: "comments", subjectUri: comment }, db),
      ).resolves.toBeUndefined();
    } finally {
      log.mockRestore();
    }
  });
});
