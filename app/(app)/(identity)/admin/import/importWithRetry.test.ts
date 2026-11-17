import { describe, expect, test, vi } from "vitest";
import { importWithRetry } from "./ImportShared";

describe("importWithRetry", () => {
  test("doesn't retry a success", async () => {
    const run = vi.fn().mockResolvedValue({ ok: true, value: 1 });
    const onRetry = vi.fn();
    expect(await importWithRetry(run, onRetry)).toEqual({ ok: true, value: 1 });
    expect(run).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  test("retries a failed result once and keeps the second outcome", async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "first" })
      .mockResolvedValueOnce({ ok: true, value: 2 });
    const onRetry = vi.fn();
    expect(await importWithRetry(run, onRetry)).toEqual({ ok: true, value: 2 });
    expect(onRetry).toHaveBeenCalledWith(2);
  });

  test("retries a rejected request and returns the last error", async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error("504"))
      .mockResolvedValueOnce({ ok: false, error: "second" });
    const res = await importWithRetry(run, () => {});
    expect(run).toHaveBeenCalledTimes(2);
    expect(res).toEqual({ ok: false, error: "second" });
  });
});
