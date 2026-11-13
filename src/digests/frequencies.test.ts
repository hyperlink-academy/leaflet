import { describe, expect, it } from "vitest";
import { nextDigestAt } from "./frequencies";

describe("digest frequency calendar", () => {
  it("sends daily at the next midnight UTC", () => {
    expect(nextDigestAt("daily", "2026-11-09T15:00:00Z", "UTC")).toBe(
      "2026-11-10T00:00:00.000Z",
    );
  });
  it("sends weekly at the end of Sunday", () => {
    expect(nextDigestAt("weekly", "2026-11-09T15:00:00Z", "UTC")).toBe(
      "2026-11-16T00:00:00.000Z",
    );
    expect(nextDigestAt("weekly", "2026-11-15T23:59:00Z", "UTC")).toBe(
      "2026-11-16T00:00:00.000Z",
    );
  });
  it("advances to the next period when already at a boundary", () => {
    expect(nextDigestAt("daily", "2026-11-10T00:00:00Z", "UTC")).toBe(
      "2026-11-11T00:00:00.000Z",
    );
    expect(nextDigestAt("weekly", "2026-11-16T00:00:00Z", "UTC")).toBe(
      "2026-11-23T00:00:00.000Z",
    );
  });
  it("respects DST for future timezone support", () => {
    expect(
      nextDigestAt("daily", "2026-03-08T05:00:00Z", "America/New_York"),
    ).toBe("2026-03-09T04:00:00.000Z");
    expect(
      nextDigestAt("daily", "2026-11-01T04:00:00Z", "America/New_York"),
    ).toBe("2026-11-02T05:00:00.000Z");
  });
  it("rejects an invalid timezone", () => {
    expect(() =>
      nextDigestAt("daily", "2026-11-09T00:00:00Z", "invalid/zone"),
    ).toThrow("Invalid digest schedule");
  });
});
