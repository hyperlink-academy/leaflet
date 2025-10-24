import { LexiconDoc } from "@atproto/lexicon";

export const PubLeafletPollDefinition: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.poll.definition",
  defs: {
    main: {
      type: "record",
      key: "tid",
      description: "Record declaring a poll",
      record: {
        type: "object",
        required: ["name", "options"],
        properties: {
          name: { type: "string", maxLength: 500, maxGraphemes: 100 },
          options: { type: "array", items: { type: "ref", ref: "#option" } },
          endDate: { type: "string", format: "datetime" },
        },
      },
    },
    option: {
      type: "object",
      properties: {
        text: { type: "string", maxLength: 500, maxGraphemes: 50 },
      },
    },
  },
};

export const PubLeafletPollVote: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.poll.vote",
  defs: {
    main: {
      type: "record",
      key: "tid",
      description: "Record declaring a vote on a poll",
      record: {
        type: "object",
        required: ["poll", "option"],
        properties: {
          poll: { type: "ref", ref: "com.atproto.repo.strongRef" },
          option: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};
