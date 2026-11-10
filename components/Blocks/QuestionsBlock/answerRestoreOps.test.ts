import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import * as base64 from "base64-js";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { answerRestoreOps } from "./answerRestoreOps";

type AnyFact = Fact<Attribute>;

const text = (content: string, from?: string) => {
  let doc = new Y.Doc();
  if (from) Y.applyUpdate(doc, base64.toByteArray(from));
  let fragment = doc.getXmlFragment("prosemirror");
  fragment.delete(0, fragment.length);
  let paragraph = new Y.XmlElement("paragraph");
  paragraph.insert(0, [new Y.XmlText(content)]);
  fragment.insert(0, [paragraph]);
  return base64.fromByteArray(Y.encodeStateAsUpdate(doc));
};

const read = (...updates: string[]) => {
  let doc = new Y.Doc();
  for (let update of updates) Y.applyUpdate(doc, base64.toByteArray(update));
  return doc.getXmlFragment("prosemirror").toJSON();
};

const block = (entity: string, position: string, value: string): AnyFact[] =>
  [
    {
      id: `ref-${entity}`,
      entity: "answer",
      attribute: "card/block",
      data: { type: "ordered-reference", value: entity, position },
    },
    {
      id: `type-${entity}`,
      entity,
      attribute: "block/type",
      data: { type: "block-type-union", value: "text" },
    },
    {
      id: `text-${entity}`,
      entity,
      attribute: "block/text",
      data: { type: "text", value },
    },
  ] as AnyFact[];

describe("answerRestoreOps", () => {
  it("does nothing when the draft matches what was published", () => {
    let facts = block("a", "a0", text("hello"));
    expect(answerRestoreOps(facts, facts, "answer")).toEqual({
      createEntities: [],
      removeBlocks: [],
      retract: [],
      assert: [],
    });
  });

  it("rewrites edited text so the merged doc reads as published", () => {
    let published = text("hello");
    let edited = text("hello there", published);
    let ops = answerRestoreOps(
      block("a", "a0", edited),
      block("a", "a0", published),
      "answer",
    );
    expect(ops.assert).toHaveLength(1);
    let value = (ops.assert[0].data as { value: string }).value;
    expect(read(edited, value)).toBe(read(published));
  });

  it("removes blocks added since publishing and brings back deleted ones", () => {
    let kept = block("a", "a0", text("hello"));
    let deleted = block("b", "a1", text("second"));
    let added = block("c", "a2", text("new"));
    let ops = answerRestoreOps(
      [...kept, ...added],
      [...kept, ...deleted],
      "answer",
    );
    expect(ops.removeBlocks).toEqual(["c"]);
    expect(ops.createEntities).toEqual(["b"]);
    expect(ops.retract).toEqual([]);
    expect(ops.assert.map((f) => f.id)).toEqual([
      "ref-b",
      "type-b",
      "text-b",
    ]);
  });

  it("retracts facts added to a published block", () => {
    let published = block("a", "a0", text("hello"));
    let extra = {
      id: "align-a",
      entity: "a",
      attribute: "block/text-alignment",
      data: { type: "text-alignment-type-union", value: "center" },
    } as AnyFact;
    expect(
      answerRestoreOps([...published, extra], published, "answer").retract,
    ).toEqual(["align-a"]);
  });
});
