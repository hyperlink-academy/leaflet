const CardAttributes = {
  "card/block": {
    type: "ordered-reference",
    cardinality: "many",
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
  "block/text": {
    type: "text",
    cardinality: "one",
  },
  "page/awareness": { type: "awareness", cardinality: "one" },
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

const ThemeAttributes = {
  "theme/page-background": {
    type: "color",
    cardinality: "one",
  },
  "theme/card-background": {
    type: "color",
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
  "theme/background-image": {
    type: "image",
    cardinality: "one",
  },
  "theme/background-image-repeat": {
    type: "number",
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
  ...CardAttributes,
  ...BlockAttributes,
  ...LinkBlockAttributes,
  ...ThemeAttributes,
};
type Attribute = typeof Attributes;
export type Data<A extends keyof typeof Attributes> = {
  text: { type: "text"; value: string };
  string: { type: "string"; value: string };
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
  "block-type-union": {
    type: "block-type-union";
    value: "text" | "image" | "card" | "heading" | "link";
  };
  color: { type: "color"; value: string };
}[(typeof Attributes)[A]["type"]];
export type FilterAttributes<F extends Partial<Attribute[keyof Attribute]>> = {
  [A in keyof Attribute as Attribute[A] extends F ? A : never]: Attribute[A];
};
