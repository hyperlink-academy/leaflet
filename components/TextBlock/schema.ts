import { Schema } from "prosemirror-model";
import { marks } from "prosemirror-schema-basic";

export const schema = new Schema({
  marks: {
    strong: marks.strong,
    em: marks.em,
  },
  nodes: {
    doc: { content: "block" },
    paragraph: {
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM: () => ["p", 0],
    },
    text: {
      group: "inline",
    },
  },
});
