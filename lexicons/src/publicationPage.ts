import { LexiconDoc } from "@atproto/lexicon";
import { PubLeafletContent } from "./content";

export const PubLeafletPublicationPage: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.publicationPage",
  defs: {
    main: {
      type: "record",
      key: "any",
      description:
        "A static page belonging to a publication (e.g. about / contact). The rkey is derived from the page path slug.",
      record: {
        type: "object",
        required: ["publication", "path", "content"],
        properties: {
          publication: { type: "string", format: "at-uri" },
          path: { type: "string" },
          title: { type: "string", maxLength: 2000 },
          publishedAt: { type: "string", format: "datetime" },
          content: { type: "ref", ref: PubLeafletContent.id },
        },
      },
    },
  },
};
