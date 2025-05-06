import { LexiconDoc } from "@atproto/lexicon";

export const PubLeafletPublication: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.publication",
  defs: {
    main: {
      type: "record",
      key: "tid",
      description: "Record declaring a publication",
      record: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", maxLength: 2000 },
          description: { type: "string", maxLength: 2000 },
        },
      },
    },
  },
};

export const PubLeafletPublicationPost: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.post",
  defs: {
    main: {
      type: "record",
      key: "tid",
      description: "Record putting a post in a document",
      record: {
        type: "object",
        required: ["post", "publishedAt"],
        properties: {
          publication: { type: "string", format: "at-uri" },
          post: { type: "ref", ref: "com.atproto.repo.strongRef" },
          publishedAt: { type: "string", format: "datetime" },
        },
      },
    },
  },
};
