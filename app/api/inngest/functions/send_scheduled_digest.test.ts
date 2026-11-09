import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DigestSchedule } from "src/digests/schedule";

const { current, advance, send } = vi.hoisted(() => ({
  current: vi.fn(),
  advance: vi.fn(),
  send: vi.fn(),
}));
vi.mock("../client", () => ({
  inngest: { createFunction: (_: unknown, handler: unknown) => handler },
  events: { digestScheduled: {} },
}));
vi.mock("src/digests/schedule", () => ({
  isCurrentDigestSchedule: current,
  advanceDigestSchedule: advance,
  digestScheduleEvent: (data: DigestSchedule) => ({ data }),
}));
vi.mock("src/digests/sendScheduled", () => ({ sendScheduledDigest: send }));
import { send_scheduled_digest } from "./send_scheduled_digest";

const schedule: DigestSchedule = {
  identity: "id",
  publication: "pub",
  generation: "version",
  due: "2026-11-10T00:00:00.000Z",
};
const next = { ...schedule, due: "2026-11-11T00:00:00.000Z" };
function context() {
  const cache = new Map<string, unknown>();
  return {
    event: { data: schedule },
    step: {
      run: async (id: string, fn: () => Promise<unknown>) => {
        if (!cache.has(id)) cache.set(id, await fn());
        return cache.get(id);
      },
      sleepUntil: vi.fn().mockResolvedValue(undefined),
      sendEvent: vi.fn().mockResolvedValue(undefined),
    },
  };
}
const run = send_scheduled_digest as unknown as (
  ctx: ReturnType<typeof context>,
) => Promise<unknown>;
beforeEach(() => {
  vi.clearAllMocks();
  current.mockResolvedValue(true);
  advance.mockResolvedValue(next);
  send.mockResolvedValue({ ok: true });
});

describe("queued digest chain", () => {
  it("sleeps until due, then queues the next period before sending", async () => {
    const ctx = context();
    await run(ctx);
    expect(ctx.step.sleepUntil).toHaveBeenCalledWith(
      "wait-for-digest",
      schedule.due,
    );
    expect(ctx.step.sendEvent).toHaveBeenCalledWith("queue-next-digest", {
      data: next,
    });
    expect(ctx.step.sendEvent.mock.invocationCallOrder[0]).toBeLessThan(
      send.mock.invocationCallOrder[0],
    );
  });
  it("does not start superseded jobs", async () => {
    current.mockResolvedValue(false);
    const ctx = context();
    await run(ctx);
    expect(ctx.step.sleepUntil).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
  it("rechecks cancellation after waking", async () => {
    advance.mockResolvedValue(null);
    const ctx = context();
    await run(ctx);
    expect(ctx.step.sendEvent).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
  it("keeps the next run queued when the current email fails and resumes delivery on retry", async () => {
    const ctx = context();
    send.mockRejectedValueOnce(new Error("Provider rejected"));
    await expect(run(ctx)).rejects.toThrow("Provider rejected");
    expect(ctx.step.sendEvent).toHaveBeenCalled();
    await run(ctx);
    expect(advance).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("continues after an empty period or missing email", async () => {
    send.mockResolvedValue({ skipped: "no_email" });
    const ctx = context();
    await run(ctx);
    expect(ctx.step.sendEvent).toHaveBeenCalledWith("queue-next-digest", {
      data: next,
    });
  });
});
