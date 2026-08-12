import { describe, expect, test } from "vitest";
import { headersAllowFraming } from "./frameHeaders";

describe("headersAllowFraming", () => {
  test("no headers allows framing", () => {
    expect(headersAllowFraming(null, null)).toBe(true);
  });

  test("any X-Frame-Options blocks", () => {
    expect(headersAllowFraming("DENY", null)).toBe(false);
    expect(headersAllowFraming("SAMEORIGIN", null)).toBe(false);
    expect(headersAllowFraming("sameorigin", null)).toBe(false);
  });

  test("frame-ancestors 'none' and 'self' block", () => {
    expect(headersAllowFraming(null, "frame-ancestors 'none'")).toBe(false);
    expect(headersAllowFraming(null, "frame-ancestors 'self'")).toBe(false);
  });

  test("frame-ancestors host lists naming other sites block", () => {
    expect(
      headersAllowFraming(null, "frame-ancestors https://example.com"),
    ).toBe(false);
  });

  test("frame-ancestors wildcard and https: allow", () => {
    expect(headersAllowFraming(null, "frame-ancestors *")).toBe(true);
    expect(headersAllowFraming(null, "frame-ancestors https:")).toBe(true);
  });

  test("frame-ancestors including leaflet.pub allows", () => {
    expect(
      headersAllowFraming(
        null,
        "frame-ancestors 'self' https://leaflet.pub https://*.leaflet.pub",
      ),
    ).toBe(true);
  });

  test("frame-ancestors supersedes X-Frame-Options", () => {
    expect(headersAllowFraming("DENY", "frame-ancestors *")).toBe(true);
    expect(headersAllowFraming(null, "default-src 'self'; frame-ancestors 'none'")).toBe(
      false,
    );
  });

  test("CSP without frame-ancestors falls back to X-Frame-Options", () => {
    expect(headersAllowFraming(null, "default-src 'self'")).toBe(true);
    expect(headersAllowFraming("DENY", "default-src 'self'")).toBe(false);
  });
});
