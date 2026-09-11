import { describe, expect, test } from "vitest";
import { canonicalizeInput, decodeInput, encodeInput } from "./inputEncoding";

describe("encodeInput / decodeInput", () => {
  test("round-trips an object", () => {
    let input = { uris: ["a", "b"], query: "hello world" };
    expect(decodeInput(encodeInput(input))).toEqual(input);
  });

  test("round-trips unicode content", () => {
    let input = { query: "café — 日本語" };
    expect(decodeInput(encodeInput(input))).toEqual(input);
  });

  test("produces a URL-safe string (no +, /, =)", () => {
    // Exercise bytes that base64-encode to '+' and '/' in the standard
    // alphabet: 0x3e -> '+', 0x3f -> '/'.
    let encoded = encodeInput({ dids: ["\x3e\x3e\x3e", "\x3f\x3f\x3f"] });
    expect(encoded).not.toMatch(/[+/=]/);
    expect(decodeInput(encoded)).toEqual({
      dids: ["\x3e\x3e\x3e", "\x3f\x3f\x3f"],
    });
  });
});

describe("canonicalizeInput", () => {
  test("sorts object keys", () => {
    expect(canonicalizeInput({ b: 1, a: 2 })).toEqual({ a: 2, b: 1 });
    expect(Object.keys(canonicalizeInput({ b: 1, a: 2 }) as object)).toEqual([
      "a",
      "b",
    ]);
  });

  test("sorts arrays of strings (DID/URI lists) regardless of caller order", () => {
    let a = canonicalizeInput({ dids: ["did:plc:b", "did:plc:a"] });
    let b = canonicalizeInput({ dids: ["did:plc:a", "did:plc:b"] });
    expect(a).toEqual(b);
  });

  test("equal requests in different key/array order encode to the same URL input", () => {
    let requestA = { uris: ["uri:2", "uri:1"], limit: 10 };
    let requestB = { limit: 10, uris: ["uri:1", "uri:2"] };
    expect(encodeInput(canonicalizeInput(requestA))).toEqual(
      encodeInput(canonicalizeInput(requestB)),
    );
  });

  test("does not sort non-string arrays", () => {
    expect(canonicalizeInput({ nums: [3, 1, 2] })).toEqual({
      nums: [3, 1, 2],
    });
  });
});
