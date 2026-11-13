import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DigestSchedule } from "src/digests/schedule";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("../client", () => ({
  inngest: { createFunction: (_: unknown, handler: unknown) => handler },
  events: { digestScheduled: {} },
}));
vi.mock("src/digests/sendScheduled", () => ({ sendScheduledDigest: send }));
import { send_scheduled_digest } from "./send_scheduled_digest";

const schedule: DigestSchedule = {
  identity: "id",
  publication: "pub",
  due: "2026-11-10T00:00:00.000Z",
};
const run = send_scheduled_digest as unknown as (ctx: {
  event: { data: DigestSchedule };
  step: { run: (id: string, fn: () => Promise<unknown>) => Promise<unknown> };
}) => Promise<unknown>;
const ctx = {
  event: { data: schedule },
  step: { run: (_id: string, fn: () => Promise<unknown>) => fn() },
};

beforeEach(() => {
  vi.clearAllMocks();
  send.mockResolvedValue({ ok: true });
});

describe("scheduled digest sender", () => {
  it("sends the digest for the event's period", async () => {
    expect(await run(ctx)).toEqual({ ok: true });
    expect(send).toHaveBeenCalledWith(schedule);
  });

  it("lets a failure reach Inngest so the step retries", async () => {
    send.mockRejectedValueOnce(new Error("Digest failed: email_send_failed"));
    await expect(run(ctx)).rejects.toThrow("email_send_failed");
  });
});
