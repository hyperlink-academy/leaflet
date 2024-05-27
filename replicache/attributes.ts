export const Attributes = {
  "card/block": {
    type: "ordered-reference",
    cardinality: "many",
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
