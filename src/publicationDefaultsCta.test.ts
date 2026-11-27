import { describe, expect, test } from "vitest";
import {
  ctaTooLongField,
  readCtaText,
  savedCtaDefaults,
} from "src/publicationDefaults";

describe("readCtaText", () => {
  test("trims fields and drops blanks", () => {
    expect(
      readCtaText("locked", {
        header: "  Join us  ",
        upgradeHeader: "   ",
        description: "",
      }),
    ).toEqual({ header: "Join us" });
  });

  test("general has no upgrade header", () => {
    expect(
      readCtaText("general", { header: "Hi", upgradeHeader: "Up" }),
    ).toEqual({ header: "Hi" });
  });

  test("rejects non-strings and over-long text", () => {
    expect(readCtaText("locked", { header: 5 })).toBeNull();
    expect(readCtaText("locked", { header: "x".repeat(2001) })).toBeNull();
    expect(readCtaText("locked", "nope")).toBeNull();
  });
});

describe("savedCtaDefaults", () => {
  test("reads valid sections and skips invalid or empty ones", () => {
    expect(
      savedCtaDefaults({
        contentGate: { audience: {} },
        cta: {
          general: { description: "About us" },
          locked: { header: 5 },
          earlyAccess: {},
        },
      }),
    ).toEqual({ general: { description: "About us" } });
  });

  test("missing or malformed cta reads as empty", () => {
    expect(savedCtaDefaults(null)).toEqual({});
    expect(savedCtaDefaults({ cta: "x" })).toEqual({});
  });
});

describe("ctaTooLongField", () => {
  test("names the kind of field over its limit", () => {
    expect(ctaTooLongField({ header: "ok", description: "ok" })).toBeNull();
    expect(ctaTooLongField({ upgradeHeader: "x".repeat(2001) })).toBe("header");
    expect(ctaTooLongField({ description: "x".repeat(10001) })).toBe(
      "description",
    );
  });
});
