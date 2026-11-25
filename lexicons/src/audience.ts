import { LexiconDoc } from "@atproto/lexicon";

export const PubLeafletAudience: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.audience",
  defs: {
    public: {
      type: "object",
      description: "Anyone, signed in or not.",
      properties: {},
    },
    subscribers: {
      type: "object",
      description:
        "All free and paid subscribers to the document's publication.",
      properties: {},
    },
    paid: {
      type: "object",
      description: "All paid members of the document's publication.",
      properties: {},
    },
    tiers: {
      type: "object",
      description: "Active members of the selected paid tiers.",
      required: ["tierIds"],
      properties: {
        tierIds: {
          type: "array",
          items: { type: "string", maxLength: 100 },
          maxLength: 50,
          description:
            "Paid tier ids that grant access. An empty selection grants no membership access.",
        },
      },
    },
    follows: {
      type: "object",
      description: "Accounts the document's author follows.",
      properties: {},
    },
    followers: {
      type: "object",
      description: "Accounts following the document's author.",
      properties: {},
    },
  },
};
