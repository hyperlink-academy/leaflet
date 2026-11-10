import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { getAuthIdentity, sendDigest } = vi.hoisted(() => ({
  getAuthIdentity: vi.fn(),
  sendDigest: vi.fn(),
}));
vi.mock("src/auth", () => ({ getAuthIdentity }));
vi.mock("src/digests/send", () => ({ sendDigest }));
vi.mock("src/utils/confirmationEmail", () => ({
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
}));
import { sendTestDigest } from "./sendTestDigest";

afterEach(() => vi.unstubAllEnvs());

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("POSTMARK_API_KEY", "configured-key");
  getAuthIdentity.mockResolvedValue({
    id: "jinny",
    atp_did: "did:plc:nb7a7tldqk7jbnij6jvdj5eg",
    entitlements: { email_notification_enabled: {} },
    email: "jinny@example.com",
  });
  sendDigest.mockResolvedValue({ ok: true, value: null });
});

describe("sendTestDigest", () => {
  it("requires the email notification flag even for dev-mode users", async () => {
    getAuthIdentity.mockResolvedValue({
      id: "jinny",
      atp_did: "did:plc:nb7a7tldqk7jbnij6jvdj5eg",
      email: "jinny@example.com",
      entitlements: {},
    });
    expect(await sendTestDigest("pub")).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(sendDigest).not.toHaveBeenCalled();
  });
  it("denies unapproved identities even when the action is invoked directly", async () => {
    getAuthIdentity.mockResolvedValue({
      id: "other",
      atp_did: "did:plc:other",
      email: "other@example.com",
    });
    expect(await sendTestDigest("pub")).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(sendDigest).not.toHaveBeenCalled();
  });
  it("requires an account email", async () => {
    getAuthIdentity.mockResolvedValue({
      id: "jinny",
      atp_did: "did:plc:nb7a7tldqk7jbnij6jvdj5eg",
      entitlements: { email_notification_enabled: {} },
      email: null,
    });
    expect(await sendTestDigest("pub")).toEqual({
      ok: false,
      error: "email_required",
    });
    expect(sendDigest).not.toHaveBeenCalled();
  });
  it.each(["", "POSTMARK_API_TEST"])(
    "rejects missing or non-delivering provider tokens",
    async (token) => {
      vi.stubEnv("POSTMARK_API_KEY", token);
      expect(await sendTestDigest("pub")).toEqual({
        ok: false,
        error: "email_not_configured",
      });
      expect(sendDigest).not.toHaveBeenCalled();
    },
  );
  it("sends only to the authenticated account and leaves frequency preferences alone", async () => {
    expect(await sendTestDigest("pub")).toEqual({ ok: true, value: null });
    expect(sendDigest).toHaveBeenCalledWith({
      identity: "jinny",
      ownerDid: "did:plc:nb7a7tldqk7jbnij6jvdj5eg",
      publication: "pub",
      email: "jinny@example.com",
      apiKey: "configured-key",
    });
  });
});
