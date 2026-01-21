import { AtUri } from "@atproto/api";
import { Schema, Node, MarkSpec, NodeSpec } from "prosemirror-model";
import { marks } from "prosemirror-schema-basic";
import { theme } from "tailwind.config";
import {
  isDocumentCollection,
  isPublicationCollection,
} from "src/utils/collectionHelpers";

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
    atMention: {
      attrs: {
        atURI: {},
        text: { default: "" },
      },
      group: "inline",
      inline: true,
      atom: true,
      selectable: true,
      draggable: true,
      parseDOM: [
        {
          tag: "span.atMention",
          getAttrs(dom: HTMLElement) {
            return {
              atURI: dom.getAttribute("data-at-uri"),
              text: dom.textContent || "",
            };
          },
        },
      ],
      toDOM(node) {
        // NOTE: This rendering should match the AtMentionLink component in
        // components/AtMentionLink.tsx. If you update one, update the other.
        let className = "atMention mention";
        let aturi = new AtUri(node.attrs.atURI);
        if (isPublicationCollection(aturi.collection))
          className += " font-bold";
        if (isDocumentCollection(aturi.collection)) className += " italic";

        // For publications and documents, show icon
        if (
          isPublicationCollection(aturi.collection) ||
          isDocumentCollection(aturi.collection)
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
                class:
                  "inline-block w-4 h-4 rounded-full mt-[3px] mr-1 align-text-top",
                alt: "",
                width: "16",
                height: "16",
                loading: "lazy",
              },
            ],
            node.attrs.text,
          ];
        }

        return [
          "span",
          {
            class: className,
            "data-at-uri": node.attrs.atURI,
          },
          node.attrs.text,
        ];
      },
    } as NodeSpec,
    didMention: {
      attrs: {
        did: {},
        text: { default: "" },
      },
      group: "inline",
      inline: true,
      atom: true,
      selectable: true,
      draggable: true,
      parseDOM: [
        {
          tag: "span.didMention",
          getAttrs(dom: HTMLElement) {
            return {
              did: dom.getAttribute("data-did"),
              text: dom.textContent || "",
            };
          },
        },
      ],
      toDOM(node) {
        return [
          "span",
          {
            class: "didMention mention",
            "data-did": node.attrs.did,
          },
          node.attrs.text,
        ];
      },
    } as NodeSpec,
  },
};
export const schema = new Schema(baseSchema);

export const multiBlockSchema = new Schema({
  marks: baseSchema.marks,
  nodes: { ...baseSchema.nodes, doc: { content: "block+" } },
});
