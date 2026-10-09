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

export const PubLeafletInteractionsQuestion: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.interactions.question",
  defs: {
    main: {
      type: "record",
      key: "tid",
      description:
        "A public question asked of a document's author, shown on the document once the author answers it (pub.leaflet.interactions.answer)",
      record: {
        type: "object",
        required: ["subject", "plaintext", "createdAt"],
        properties: {
          subject: {
            type: "string",
            format: "at-uri",
            description: "The document the question is asked on.",
          },
          plaintext: {
            type: "string",
            maxLength: 10000,
            maxGraphemes: 1000,
          },
          facets: {
            type: "array",
            items: { type: "ref", ref: "pub.leaflet.richtext.facet" },
          },
          createdAt: { type: "string", format: "datetime" },
        },
      },
    },
  },
};

export const PubLeafletInteractionsAnswer: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.interactions.answer",
  defs: {
    main: {
      type: "record",
      key: "any",
      description:
        "The author's answer to a pub.leaflet.interactions.question, written in the repo that owns the question's subject document. One record per question.",
      record: {
        type: "object",
        required: ["question", "document", "content", "createdAt"],
        properties: {
          question: {
            type: "ref",
            ref: "com.atproto.repo.strongRef",
            description: "The question being answered.",
          },
          document: {
            type: "string",
            format: "at-uri",
            description: "The document the question was asked on.",
          },
          content: {
            type: "ref",
            ref: "pub.leaflet.pages.linearDocument",
            description: "The answer's blocks.",
          },
          createdAt: { type: "string", format: "datetime" },
        },
      },
    },
  },
};
