export const Attributes = {
  "card/block": {
    type: "reference",
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
  "block/card": {
    type: "reference",
    cardinality: "one",
  },
} as const;
