import { describe, expect, test } from "vitest";
import { createYjsText } from "src/utils/createYjsText";
import { counterText, wordCount } from "./WordCounterBlock";

const fact = (
  entity: string,
  attribute: "card/block" | "block/type" | "block/card" | "block/text",
  value: string,
  position?: string,
) => ({ id: `${entity}-${attribute}-${value}`, entity, attribute, data: { value, position } });

describe("Word Counter", () => {
  let facts = [
    fact("page", "card/block", "before", "a"),
    fact("page", "card/block", "counter", "b"),
    fact("page", "card/block", "after", "c"),
    fact("page", "card/block", "subpage-link", "d"),
    fact("before", "block/type", "text"),
    fact("before", "block/text", createYjsText("Before counter")),
    fact("counter", "block/type", "word-counter"),
    fact("after", "block/type", "text"),
    fact("after", "block/text", createYjsText("After counter")),
    fact("subpage-link", "block/type", "card"),
    fact("subpage-link", "block/card", "subpage"),
    fact("subpage", "card/block", "subpage-text", "a"),
    fact("subpage-text", "block/type", "text"),
    fact("subpage-text", "block/text", createYjsText("Nested page")),
  ];

  test("counts the current page and accounts for whitespace between blocks", () => {
    let text = counterText(facts, "page", "counter", {
      onlyCountBelow: false,
      includeSubpages: false,
    });
    expect(text).toBe("Before counter\nAfter counter");
    expect(text.length).toBe(28);
    expect(wordCount(text)).toBe(4);
  });

  test("can count only blocks after the counter", () => {
    let text = counterText(facts, "page", "counter", {
      onlyCountBelow: true,
      includeSubpages: false,
    });
    expect(text).toBe("After counter");
    expect(wordCount(text)).toBe(2);
  });

  test("includes all nested pages when requested", () => {
    let text = counterText(facts, "page", "counter", {
      onlyCountBelow: false,
      includeSubpages: true,
    });
    expect(text).toBe("Before counter\nAfter counter\nNested page");
    expect(wordCount(text)).toBe(6);
  });
});
