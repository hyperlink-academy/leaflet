import { describe, expect, test } from "vitest";
import { dropcapLength } from "./dropcap";

describe("dropcapLength", () => {
  test("covers the first letter", () => {
    expect(dropcapLength("Early in the adaptation")).toBe(1);
  });
  test("includes punctuation hugging the letter, like ::first-letter does", () => {
    expect(dropcapLength("“Tis the season")).toBe(2);
    expect(dropcapLength("I'm here")).toBe(2);
    expect(dropcapLength("(A) first")).toBe(3);
  });
  test("keeps a multi-code-unit grapheme whole", () => {
    expect(dropcapLength("👩‍🚀 lands")).toBe("👩‍🚀".length);
    expect(dropcapLength("Éa")).toBe(1);
    expect(dropcapLength("éa")).toBe(2);
  });
  test("has nothing to enlarge for empty or whitespace-led text", () => {
    expect(dropcapLength("")).toBe(0);
    expect(dropcapLength(" leading space")).toBe(0);
    expect(dropcapLength("…")).toBe(0);
  });
});
