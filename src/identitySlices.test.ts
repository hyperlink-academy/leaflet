import { describe, expect, test, vi } from "vitest";

vi.mock("supabase/serverClient", () => ({ supabaseServerClient: {} }));
vi.mock("src/identity", () => ({
  getProfilesFromCache: async () => new Map(),
}));

import {
  IDENTITY_SLICES,
  identitySliceKey,
  invalidateIdentitySlices,
} from "./identitySlices";
import type { IdentityCacheStore } from "./identityCache";

function memoryStore() {
  const entries = new Map<string, string>();
  const store: IdentityCacheStore & { keys(): string[] } = {
    async get(key) {
      return entries.get(key) ?? null;
    },
    async setex(key, _seconds, value) {
      entries.set(key, value);
    },
    async del(...keys) {
      for (const key of keys) entries.delete(key);
    },
    keys() {
      return [...entries.keys()].sort();
    },
  };
  return store;
}

describe("identity slices", () => {
  test("keys are distinct per slice and per identity", () => {
    const keys = new Set(
      IDENTITY_SLICES.flatMap((slice) => [
        identitySliceKey(slice, "id-a"),
        identitySliceKey(slice, "id-b"),
      ]),
    );
    expect(keys.size).toBe(IDENTITY_SLICES.length * 2);
  });

  test("invalidating one slice leaves the others cached", async () => {
    const store = memoryStore();
    for (const slice of IDENTITY_SLICES)
      await store.setex(identitySliceKey(slice, "id-a"), 30, "{}");
    await store.setex(identitySliceKey("subscriptions", "id-b"), 30, "{}");

    await invalidateIdentitySlices("id-a", ["subscriptions"], store);

    expect(store.keys()).toEqual(
      [
        ...IDENTITY_SLICES.filter((s) => s !== "subscriptions").map((s) =>
          identitySliceKey(s, "id-a"),
        ),
        identitySliceKey("subscriptions", "id-b"),
      ].sort(),
    );
  });
});
