import { LexiconDoc } from "@atproto/lexicon";

export const PubLeafletInteractionsRecommend: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.interactions.recommend",
  defs: {
    main: {
      type: "record",
      key: "tid",
      description: "Record representing a recommend on a document",
      record: {
        type: "object",
        required: ["subject", "createdAt"],
        properties: {
          subject: { type: "string", format: "at-uri" },
          createdAt: { type: "string", format: "datetime" },
        },
      },
    },
  },
};
