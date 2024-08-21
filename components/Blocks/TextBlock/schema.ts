import { Schema, Node, MarkSpec } from "prosemirror-model";
import { marks } from "prosemirror-schema-basic";
import { theme } from "tailwind.config";

let baseSchema = {
  marks: {
    strong: marks.strong,
    em: marks.em,
    underline: {
      parseDOM: [
        { tag: "u" },
        {
          style: "text-decoration=underline",
        },
        {
          style: "text-decoration=none",
          clearMark: (m) => m.type.name == "underline",
        },
      ],
      toDOM() {
        return ["u", { class: "underline" }, 0];
      },
    } as MarkSpec,
    strikethrough: {
      parseDOM: [
        { tag: "s" },
        { tag: "del" },
        {
          style: `text-decoration=line-through`,
        },
        {
          style: "text-decoration=none",
          clearMark: (m) => m.type.name == "strikethrough",
        },
      ],
      toDOM() {
        return [
          "s",
          {
            style: `text-decoration-color: ${theme.colors.tertiary};`,
          },
          0,
        ];
      },
    } as MarkSpec,
    highlight: {
      attrs: {
        color: {
          default: "1",
        },
      },
      parseDOM: [
        {
          tag: "span.highlight",
          getAttrs(dom: HTMLElement) {
            return {
              color: dom.getAttribute("data-color"),
            };
          },
        },
      ],
      toDOM(node) {
        let { color } = node.attrs;
        return [
          "span",
          {
            class: "highlight",
            "data-color": color,
            style: `background-color: ${color === "1" ? theme.colors["highlight-1"] : color === "2" ? theme.colors["highlight-2"] : theme.colors["highlight-3"]}`,
          },
          0,
        ];
      },
    } as MarkSpec,
    link: {
      attrs: {
        href: {},
      },
      inclusive: false,
      parseDOM: [
        {
          tag: "a[href]",
          getAttrs(dom: HTMLElement) {
            return {
              href: dom.getAttribute("href"),
            };
          },
        },
      ],
      toDOM(node) {
        let { href } = node.attrs;
        return ["a", { href, target: "_blank" }, 0];
      },
    } as MarkSpec,
  },
  nodes: {
    doc: { content: "block" },
    paragraph: {
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM: () => ["p", 0] as const,
    },
    text: {
      group: "inline",
    },
  },
};
export const schema = new Schema(baseSchema);

export const multiBlockSchema = new Schema({
  marks: baseSchema.marks,
  nodes: { ...baseSchema.nodes, doc: { content: "block+" } },
});
