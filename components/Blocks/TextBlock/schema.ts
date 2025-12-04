import { AtUri } from "@atproto/api";
import { Schema, Node, MarkSpec } from "prosemirror-model";
import { marks } from "prosemirror-schema-basic";
import { theme } from "tailwind.config";

let baseSchema = {
  marks: {
    strong: marks.strong,
    em: marks.em,
    code: {
      parseDOM: [
        {
          tag: "code",
        },
      ],

      toDOM() {
        return ["code", { class: "inline-code" }, 0];
      },
    } as MarkSpec,
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
    atMention: {
      attrs: {
        atURI: {},
      },
      inclusive: false,
      parseDOM: [
        {
          tag: "span.atMention",
          getAttrs(dom: HTMLElement) {
            return {
              atURI: dom.getAttribute("data-at-uri"),
            };
          },
        },
      ],
      toDOM(node) {
        // NOTE: This rendering should match the AtMentionLink component in
        // components/AtMentionLink.tsx. If you update one, update the other.
        // We can't use the React component here because ProseMirror expects DOM specs.
        let className = "atMention text-accent-contrast";
        let aturi = new AtUri(node.attrs.atURI);
        if (aturi.collection === "pub.leaflet.publication")
          className += " font-bold";
        if (aturi.collection === "pub.leaflet.document") className += " italic";

        // For publications and documents, show icon
        if (
          aturi.collection === "pub.leaflet.publication" ||
          aturi.collection === "pub.leaflet.document"
        ) {
          return [
            "span",
            {
              class: className,
              "data-at-uri": node.attrs.atURI,
            },
            [
              "img",
              {
                src: `/api/pub_icon?at_uri=${encodeURIComponent(node.attrs.atURI)}`,
                class: "inline-block w-5 h-5 rounded-full mr-1 align-text-top",
                alt: "",
                width: "16",
                height: "16",
                loading: "lazy",
              },
            ],
            ["span", 0],
          ];
        }

        return [
          "span",
          {
            class: className,
            "data-at-uri": node.attrs.atURI,
          },
          0,
        ];
      },
    } as MarkSpec,
    didMention: {
      attrs: {
        did: {},
      },
      inclusive: false,
      parseDOM: [
        {
          tag: "span.didMention",
          getAttrs(dom: HTMLElement) {
            return {
              did: dom.getAttribute("data-did"),
            };
          },
        },
      ],
      toDOM(node) {
        return [
          "span",
          {
            class: "didMention text-accent-contrast",
            "data-did": node.attrs.did,
          },
          0,
        ];
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
    hard_break: {
      group: "inline",
      inline: true,
      selectable: false,
      parseDOM: [{ tag: "br" }],
      toDOM: () => ["br"] as const,
    },
  },
};
export const schema = new Schema(baseSchema);

export const multiBlockSchema = new Schema({
  marks: baseSchema.marks,
  nodes: { ...baseSchema.nodes, doc: { content: "block+" } },
});
