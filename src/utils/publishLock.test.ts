import { describe, expect, it } from "vitest";
import { withPublishLock } from "./publishLock";

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  let promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("withPublishLock", () => {
  it("refuses an overlapping publish of the same leaflet", async () => {
    let first = deferred<string>();
    let firstRun = withPublishLock("leaflet-a", () => first.promise);
    let second = await withPublishLock("leaflet-a", async () => "second");
    expect(second).toEqual({ acquired: false });

    first.resolve("first");
    expect(await firstRun).toEqual({ acquired: true, value: "first" });
  });

  it("lets different leaflets publish concurrently", async () => {
    let first = deferred<string>();
    let firstRun = withPublishLock("leaflet-a", () => first.promise);
    let other = await withPublishLock("leaflet-b", async () => "other");
    expect(other).toEqual({ acquired: true, value: "other" });
    first.resolve("first");
    await firstRun;
  });

  it("releases the lock once the publish settles, even on failure", async () => {
    await expect(
      withPublishLock("leaflet-a", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    let retry = await withPublishLock("leaflet-a", async () => "retry");
    expect(retry).toEqual({ acquired: true, value: "retry" });
  });
});
