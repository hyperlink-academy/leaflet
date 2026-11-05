import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthIdentity, from, query } = vi.hoisted(() => {
  const query: any = {};
  for (const method of ["select", "eq"]) query[method] = vi.fn(() => query);
  query.maybeSingle = vi.fn();
  query.upsert = vi.fn();
  return { getAuthIdentity: vi.fn(), from: vi.fn(() => query), query };
});
vi.mock("src/auth", () => ({ getAuthIdentity }));
vi.mock("supabase/serverClient", () => ({
  supabaseServerClient: { from },
}));
import {
  getNotificationPreference,
  setNotificationPreference,
} from "./notificationSettings";

beforeEach(() => {
  vi.clearAllMocks();
  getAuthIdentity.mockResolvedValue({
    id: "owner-id",
    atp_did: "did:plc:owner",
  });
  query.maybeSingle.mockReset();
  query.upsert.mockResolvedValue({ error: null });
});

const owner = () =>
  query.maybeSingle.mockResolvedValueOnce({
    data: { identity_did: "did:plc:owner" },
    error: null,
  });

describe("notification preferences", () => {
  it("treats a missing preference as off without creating an opt-in", async () => {
    owner();
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect(await getNotificationPreference("pub")).toEqual({
      ok: true,
      value: "off",
    });
    expect(query.upsert).not.toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith("identity", "owner-id");
  });

  it.each(["daily", "weekly", "off"] as const)(
    "saves %s for the signed-in identity",
    async (frequency) => {
      owner();
      expect((await setNotificationPreference("pub", frequency)).ok).toBe(true);
      expect(query.upsert).toHaveBeenCalledWith(
        {
          identity: "owner-id",
          publication: "pub",
          channel: "email",
          enabled_types: frequency === "off" ? [] : ["digest"],
          digest_frequency: frequency === "off" ? null : frequency,
        },
        { onConflict: "identity,publication,channel" },
      );
    },
  );

  it("rejects signed-out users", async () => {
    getAuthIdentity.mockResolvedValue(null);
    expect(await setNotificationPreference("pub", "daily")).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it.each([
    getNotificationPreference,
    (uri: string) => setNotificationPreference(uri, "daily"),
  ])("rejects access to another owner's publication", async (action) => {
    query.maybeSingle.mockResolvedValueOnce({
      data: { identity_did: "did:plc:other" },
      error: null,
    });
    expect(await action("pub")).toEqual({ ok: false, error: "unauthorized" });
    expect(from).not.toHaveBeenCalledWith("notification_preferences");
  });

  it("rejects invalid frequencies before writing", async () => {
    expect(await setNotificationPreference("pub", "hourly" as "daily")).toEqual(
      { ok: false, error: "invalid_frequency" },
    );
    expect(from).not.toHaveBeenCalled();
  });

  it("reports database failures", async () => {
    owner();
    query.upsert.mockResolvedValueOnce({ error: { message: "failed" } });
    expect(await setNotificationPreference("pub", "weekly")).toEqual({
      ok: false,
      error: "database_error",
    });
  });
});
