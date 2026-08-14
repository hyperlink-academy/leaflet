import { describe, expect, it } from "vitest";
import {
  parseTierDescriptionDoc,
  tierDescriptionPlainText,
} from "./tierDescriptionDoc";

const richDoc = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Access to " },
        { type: "text", text: "everything", marks: [{ type: "strong" }] },
        { type: "hard_break" },
        { type: "text", text: "and more" },
      ],
    },
    { type: "paragraph" },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Cancel anytime" }],
    },
  ],
});

describe("parseTierDescriptionDoc", () => {
  it("parses a serialized doc", () => {
    expect(parseTierDescriptionDoc(richDoc)?.content).toHaveLength(3);
  });

  it("returns null for legacy plain text and empty values", () => {
    expect(parseTierDescriptionDoc("Access to members-only posts")).toBeNull();
    expect(parseTierDescriptionDoc(null)).toBeNull();
    expect(parseTierDescriptionDoc("")).toBeNull();
  });

  it("returns null for JSON that isn't a doc", () => {
    expect(parseTierDescriptionDoc('{"type":"paragraph"}')).toBeNull();
    expect(parseTierDescriptionDoc("{not json")).toBeNull();
  });
});

describe("tierDescriptionPlainText", () => {
  it("flattens a doc to newline-separated text", () => {
    expect(tierDescriptionPlainText(richDoc)).toBe(
      "Access to everything\nand more\n\nCancel anytime",
    );
  });

  it("passes legacy plain text through", () => {
    expect(tierDescriptionPlainText("Just text")).toBe("Just text");
    expect(tierDescriptionPlainText(null)).toBe("");
  });
});
