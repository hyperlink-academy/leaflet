import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DueDigest } from "src/digests/schedule";

const { initialize, find, advance } = vi.hoisted(() => ({
  initialize: vi.fn(),
  find: vi.fn(),
  advance: vi.fn(),
}));
vi.mock("inngest", () => ({ cron: (expression: string) => expression }));
vi.mock("../client", () => ({
  inngest: {
    createFunction: (config: unknown, handler: unknown) => ({
      config,
      handler,
    }),
  },
}));
vi.mock("src/digests/schedule", () => ({
  initializeDigestSchedules: initialize,
  findDueDigests: find,
  advanceDigestSchedules: advance,
  digestScheduleEvent: (data: object) => ({ data }),
}));
import { queue_due_digests } from "./queue_due_digests";

const due: DueDigest = {
  identity: "id",
  publication: "pub",
  due: "2026-11-10T00:00:00.000Z",
  frequency: "daily",
};
const { config, handler } = queue_due_digests as unknown as {
  config: { triggers: string[] };
  handler: (ctx: unknown) => Promise<unknown>;
};
const calls: string[] = [];
const step = {
  run: async (id: string, fn: () => Promise<unknown>) => {
    calls.push(id);
    return fn();
  },
  sendEvent: vi.fn(async () => {
    calls.push("queue-digests");
  }),
};

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  initialize.mockResolvedValue(0);
  find.mockResolvedValue([due]);
  advance.mockResolvedValue(undefined);
});

describe("queue due digests", () => {
  it("runs every hour", () => {
    expect(config.triggers).toEqual(["0 * * * *"]);
  });

  it("queues each due digest before advancing its schedule", async () => {
    expect(await handler({ step })).toEqual({ queued: 1 });
    expect(step.sendEvent).toHaveBeenCalledWith("queue-digests", [
      { data: { identity: "id", publication: "pub", due: due.due } },
    ]);
    expect(calls).toEqual([
      "initialize-schedules",
      "find-due",
      "queue-digests",
      "advance-schedules",
    ]);
    expect(advance).toHaveBeenCalledWith([due]);
  });

  it("does nothing when no digest is due", async () => {
    find.mockResolvedValue([]);
    expect(await handler({ step })).toEqual({ queued: 0 });
    expect(step.sendEvent).not.toHaveBeenCalled();
    expect(advance).not.toHaveBeenCalled();
  });
});
