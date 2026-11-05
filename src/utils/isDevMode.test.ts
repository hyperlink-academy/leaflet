import { describe, expect, it } from "vitest";
import { isDevMode } from "./isDevMode";

describe("isDevMode", () => {
  it("allows Jinny's Bluesky identity", () => {
    expect(isDevMode({ atp_did: "did:plc:nb7a7tldqk7jbnij6jvdj5eg" })).toBe(
      true,
    );
  });

  it("allows Jared's email identity", () => {
    expect(isDevMode({ email: "jared@hyperlink.academy" })).toBe(true);
  });

  it("denies other accounts and signed-out visitors", () => {
    expect(
      isDevMode({
        atp_did: "did:plc:other",
        email: "other@example.com",
      }),
    ).toBe(false);
    expect(isDevMode({})).toBe(false);
    expect(isDevMode(null)).toBe(false);
    expect(isDevMode(undefined)).toBe(false);
  });
});
