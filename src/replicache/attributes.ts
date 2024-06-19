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
  "block/position": {
    type: "text",
    cardinality: "one",
  },
  "block/text": {
    type: "text",
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

const ThemeAttributes = {
  "theme/page-background": {
    type: "color",
    cardinality: "one",
  },
  "theme/card-background": {
    type: "color",
    cardinality: "one",
  },
  "theme/card-background-alpha": {
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
  "theme/background-image": {
    type: "image",
    cardinality: "one",
  },
  "theme/background-image-repeat": {
    type: "number",
    cardinality: "one",
  },
} as const;

export const Attributes = {
  ...CardAttributes,
  ...BlockAttributes,
  ...ThemeAttributes,
};
type Attribute = typeof Attributes;
export type Data<A extends keyof typeof Attributes> = {
  text: { type: "text"; value: string };
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
  number: {
    type: "number";
    value: number;
  };
  reference: { type: "reference"; value: string };
  "block-type-union": {
    type: "block-type-union";
    value: "text" | "image" | "card";
  };
  color: { type: "color"; value: string };
}[(typeof Attributes)[A]["type"]];
export type FilterAttributes<F extends Partial<Attribute[keyof Attribute]>> = {
  [A in keyof Attribute as Attribute[A] extends F ? A : never]: Attribute[A];
};
