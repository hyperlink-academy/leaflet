import { LexiconDoc } from "@atproto/lexicon";
import { PubLeafletRichTextFacet } from "./facet";

export const PubLeafletComment: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.comment",
  revision: 1,
  description: "A lexicon for comments on documents",
  defs: {
    main: {
      type: "record",
      key: "tid",
      description: "Record containing a comment",
      record: {
        type: "object",
        required: ["subject", "plaintext", "createdAt"],
        properties: {
          subject: { type: "string", format: "at-uri" },
          createdAt: { type: "string", format: "datetime" },
          reply: { type: "ref", ref: "#replyRef" },
          plaintext: { type: "string" },
          facets: {
            type: "array",
            items: { type: "ref", ref: PubLeafletRichTextFacet.id },
          },
        },
      },
    },
    replyRef: {
      type: "object",
      required: ["parent"],
      properties: {
        parent: { type: "string", format: "at-uri" },
      },
    },
  },
};
