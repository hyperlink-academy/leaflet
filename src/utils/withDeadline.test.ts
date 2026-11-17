import { describe, expect, test, vi } from "vitest";
import { DeadlineError, withDeadline } from "./withDeadline";

describe("withDeadline", () => {
  test("passes through a value that arrives in time", async () => {
    await expect(withDeadline(Promise.resolve(1), 50, "x")).resolves.toBe(1);
  });

  test("passes through a rejection that arrives in time", async () => {
    await expect(
      withDeadline(Promise.reject(new Error("boom")), 50, "x"),
    ).rejects.toThrow("boom");
  });

  test("rejects a promise that never settles", async () => {
    await expect(
      withDeadline(new Promise(() => {}), 10, "stalled thing"),
    ).rejects.toBeInstanceOf(DeadlineError);
  });

  test("hands a late value to onLate", async () => {
    const onLate = vi.fn();
    const slow = new Promise<string>((r) => setTimeout(() => r("lock"), 30));
    await expect(withDeadline(slow, 5, "x", onLate)).rejects.toBeInstanceOf(
      DeadlineError,
    );
    await slow;
    await Promise.resolve();
    expect(onLate).toHaveBeenCalledWith("lock");
  });
});
