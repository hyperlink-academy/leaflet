import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationPreference } from "src/notificationPreferences";

const { getAuthIdentity, from, query, rpc } = vi.hoisted(() => {
  const query: any = {};
  for (const method of ["select", "eq"]) query[method] = vi.fn(() => query);
  query.maybeSingle = vi.fn();
  return {
    getAuthIdentity: vi.fn(),
    from: vi.fn(() => query),
    query,
    rpc: vi.fn(),
  };
});
vi.mock("src/auth", () => ({ getAuthIdentity }));
vi.mock("supabase/serverClient", () => ({
  supabaseServerClient: { from, rpc },
}));
import {
  getNotificationPreferences,
  setNotificationPreference,
} from "./notificationSettings";

beforeEach(() => {
  vi.clearAllMocks();
  getAuthIdentity.mockResolvedValue({
    id: "owner-id",
    atp_did: "did:plc:owner",
    entitlements: { email_notification_enabled: {} },
  });
  query.maybeSingle.mockReset();
  rpc.mockResolvedValue({ error: null });
});
const owner = () =>
  query.maybeSingle.mockResolvedValueOnce({
    data: { identity_did: "did:plc:owner" },
    error: null,
  });

describe("notification preferences", () => {
  it("denies reading and changing preferences without the feature flag", async () => {
    getAuthIdentity.mockResolvedValue({
      id: "owner-id",
      atp_did: "did:plc:owner",
      entitlements: {},
    });
    expect(await getNotificationPreferences("pub")).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(
      await setNotificationPreference("pub", {
        type: "comments",
        frequency: "instant",
      }),
    ).toEqual({ ok: false, error: "unauthorized" });
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
  it("returns all missing preferences as off without creating opt-ins", async () => {
    owner();
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect(await getNotificationPreferences("pub")).toEqual({
      ok: true,
      value: { digest: "off", comments: "off" },
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith("identity", "owner-id");
  });

  it("loads digest and comment settings together", async () => {
    owner();
    query.maybeSingle.mockResolvedValueOnce({
      data: {
        enabled_types: ["digest", "comments"],
        digest_frequency: "weekly",
      },
      error: null,
    });
    expect(await getNotificationPreferences("pub")).toEqual({
      ok: true,
      value: { digest: "weekly", comments: "instant" },
    });
  });

  it("does not enable a digest from frequency alone", async () => {
    owner();
    query.maybeSingle.mockResolvedValueOnce({
      data: { enabled_types: [], digest_frequency: "weekly" },
      error: null,
    });
    expect(await getNotificationPreferences("pub")).toEqual({
      ok: true,
      value: { digest: "off", comments: "off" },
    });
  });

  it.each<NotificationPreference>([
    { type: "digest", frequency: "daily" },
    { type: "digest", frequency: "weekly" },
    { type: "digest", frequency: "off" },
    { type: "comments", frequency: "instant" },
    { type: "comments", frequency: "off" },
  ])("saves $type $frequency through one setter", async (preference) => {
    owner();
    expect((await setNotificationPreference("pub", preference)).ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("set_notification_preference", {
      p_identity: "owner-id",
      p_publication: "pub",
      p_type: preference.type,
      p_frequency: preference.frequency,
    });
  });

  it("rejects signed-out users", async () => {
    getAuthIdentity.mockResolvedValue(null);
    expect(
      await setNotificationPreference("pub", {
        type: "comments",
        frequency: "instant",
      }),
    ).toEqual({ ok: false, error: "unauthorized" });
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    getNotificationPreferences,
    (uri: string) =>
      setNotificationPreference(uri, { type: "digest", frequency: "daily" }),
    (uri: string) =>
      setNotificationPreference(uri, {
        type: "comments",
        frequency: "instant",
      }),
  ])("rejects access to another owner's publication", async (action) => {
    query.maybeSingle.mockResolvedValueOnce({
      data: { identity_did: "did:plc:other" },
      error: null,
    });
    expect(await action("pub")).toEqual({ ok: false, error: "unauthorized" });
    expect(from).not.toHaveBeenCalledWith("notification_preferences");
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    { type: "digest", frequency: "instant" },
    { type: "comments", frequency: "daily" },
    { type: "subscriptions", frequency: "instant" },
    null,
  ])("rejects invalid combinations at runtime", async (preference) => {
    expect(
      await setNotificationPreference(
        "pub",
        preference as NotificationPreference,
      ),
    ).toEqual({ ok: false, error: "invalid_frequency" });
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reports database failures", async () => {
    owner();
    rpc.mockResolvedValueOnce({ error: { message: "failed" } });
    expect(
      await setNotificationPreference("pub", {
        type: "digest",
        frequency: "weekly",
      }),
    ).toEqual({ ok: false, error: "database_error" });
  });
});
