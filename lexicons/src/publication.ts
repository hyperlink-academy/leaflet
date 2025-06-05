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
          base_path: { type: "string", format: "uri" },
          description: { type: "string", maxLength: 2000 },
          icon: { type: "blob", accept: ["image/*"], maxSize: 1000000 },
        },
      },
    },
  },
};

export const PubLeafletPublicationSubscription: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.publication.subscription",
  defs: {
    main: {
      type: "record",
      key: "tid",
      description: "Record declaring a subscription to a publication",
      record: {
        type: "object",
        required: ["publication"],
        properties: {
          publication: { type: "string", format: "at-uri" },
        },
      },
    },
  },
};
