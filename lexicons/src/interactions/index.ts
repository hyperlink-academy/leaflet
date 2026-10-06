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

export const PubLeafletInteractionsReply: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.interactions.reply",
  defs: {
    main: {
      type: "record",
      key: "tid",
      description:
        "Submits one of the author's own documents as a reply to another document",
      record: {
        type: "object",
        required: ["subject", "document", "createdAt"],
        properties: {
          subject: {
            type: "string",
            format: "at-uri",
            description: "The document being replied to.",
          },
          document: {
            type: "string",
            format: "at-uri",
            description:
              "The reply: a document in the same repo as this record.",
          },
          createdAt: { type: "string", format: "datetime" },
        },
      },
    },
  },
};

export const PubLeafletInteractionsReplyVisibility: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.interactions.replyVisibility",
  defs: {
    main: {
      type: "record",
      key: "any",
      description:
        "Declares which submitted replies are shown on a document. Lives in the document's repo, with a record key matching the document's.",
      record: {
        type: "object",
        required: ["subject", "allowed"],
        properties: {
          subject: {
            type: "string",
            format: "at-uri",
            description: "The document whose replies this record moderates.",
          },
          allowed: {
            type: "array",
            maxLength: 500,
            description:
              "The pub.leaflet.interactions.reply records shown on the document.",
            items: { type: "string", format: "at-uri" },
          },
        },
      },
    },
  },
};
