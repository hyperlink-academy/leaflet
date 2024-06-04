export const Attributes = {
  "card/block": {
    type: "ordered-reference",
    cardinality: "many",
  },
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

type Attribute = typeof Attributes;
export type FilterAttributes<F extends Partial<Attribute[keyof Attribute]>> = {
  [A in keyof Attribute as Attribute[A] extends F ? A : never]: Attribute[A];
};