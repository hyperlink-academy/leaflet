const RootAttributes = {
  "root/page": {
    type: "ordered-reference",
    cardinality: "many",
  },
} as const;
const PageAttributes = {
  "card/block": {
    type: "ordered-reference",
    cardinality: "many",
  },
  "page/type": {
    type: "page-type-union",
    cardinality: "one",
  },
  "canvas/block": {
    type: "spatial-reference",
    cardinality: "many",
  },
  "canvas/block/width": {
    type: "number",
    cardinality: "one",
  },
  "canvas/block/rotation": {
    type: "number",
    cardinality: "one",
  },
  "canvas/narrow-width": {
    type: "boolean",
    cardinality: "one",
  },
  "canvas/background-pattern": {
    type: "canvas-pattern-union",
    cardinality: "one",
  },
} as const;

const BlockAttributes = {
  "block/type": {
    type: "block-type-union",
    cardinality: "one",
  },
  "block/is-list": {
    type: "boolean",
    cardinality: "one",
  },
  "block/check-list": {
    type: "boolean",
    cardinality: "one",
  },
  "block/text": {
    type: "text",
    cardinality: "one",
  },
  "block/heading-level": {
    type: "number",
    cardinality: "one",
  },
  "block/image": {
    type: "image",
    cardinality: "one",
  },
  "block/card": {
    type: "reference",
    cardinality: "one",
  },
} as const;

const MailboxAttributes = {
  "mailbox/draft": {
    type: "reference",
    cardinality: "one",
  },
  "mailbox/archive": {
    type: "reference",
    cardinality: "one",
  },
  "mailbox/subscriber-count": {
    type: "number",
    cardinality: "one",
  },
} as const;

const LinkBlockAttributes = {
  "link/preview": {
    type: "image",
    cardinality: "one",
  },
  "link/url": {
    type: "string",
    cardinality: "one",
  },
  "link/description": {
    type: "string",
    cardinality: "one",
  },
  "link/title": {
    type: "string",
    cardinality: "one",
  },
} as const;

const EmbedBlockAttributes = {
  "embed/url": {
    type: "string",
    cardinality: "one",
  },
} as const;

export const ThemeAttributes = {
  "theme/page-background": {
    type: "color",
    cardinality: "one",
  },
  "theme/background-image": {
    type: "image",
    cardinality: "one",
  },
  "theme/background-image-repeat": {
    type: "number",
    cardinality: "one",
  },
  "theme/card-background": {
    type: "color",
    cardinality: "one",
  },
  "theme/card-background-image": {
    type: "image",
    cardinality: "one",
  },
  "theme/card-background-image-repeat": {
    type: "number",
    cardinality: "one",
  },
  "theme/card-background-image-opacity": {
    type: "number",
    cardinality: "one",
  },
  "theme/primary": {
    type: "color",
    cardinality: "one",
  },
  "theme/accent-background": {
    type: "color",
    cardinality: "one",
  },
  "theme/accent-text": {
    type: "color",
    cardinality: "one",
  },
  "theme/highlight-1": {
    type: "color",
    cardinality: "one",
  },
  "theme/highlight-2": {
    type: "color",
    cardinality: "one",
  },
  "theme/highlight-3": {
    type: "color",
    cardinality: "one",
  },
} as const;

export const Attributes = {
  ...RootAttributes,
  ...PageAttributes,
  ...BlockAttributes,
  ...LinkBlockAttributes,
  ...ThemeAttributes,
  ...MailboxAttributes,
  ...EmbedBlockAttributes,
};
type Attribute = typeof Attributes;
export type Data<A extends keyof typeof Attributes> = {
  text: { type: "text"; value: string };
  string: { type: "string"; value: string };
  "spatial-reference": {
    type: "spatial-reference";
    position: { x: number; y: number };
    value: string;
  };
  "ordered-reference": {
    type: "ordered-reference";
    position: string;
    value: string;
  };
  image: {
    type: "image";
    fallback: string;
    src: string;
    height: number;
    width: number;
    local?: string;
  };
  boolean: {
    type: "boolean";
    value: boolean;
  };
  number: {
    type: "number";
    value: number;
  };
  awareness: {
    type: "awareness";
    value: string;
  };
  reference: { type: "reference"; value: string };
  "page-type-union": {
    type: "page-type-union";
    value: "doc" | "canvas" | "discussion";
  };
  "block-type-union": {
    type: "block-type-union";
    value:
      | "text"
      | "image"
      | "card"
      | "heading"
      | "link"
      | "mailbox"
      | "collection"
      | "embed";
  };
  "canvas-pattern-union": {
    type: "canvas-pattern-union";
    value: "dot" | "grid" | "plain";
  };
  color: { type: "color"; value: string };
}[(typeof Attributes)[A]["type"]];
export type FilterAttributes<F extends Partial<Attribute[keyof Attribute]>> = {
  [A in keyof Attribute as Attribute[A] extends F ? A : never]: Attribute[A];
};
