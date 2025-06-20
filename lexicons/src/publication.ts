import { LexiconDoc } from "@atproto/lexicon";
import { ColorUnion, PubLeafletThemeBackgroundImage } from "./theme";

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
          theme: { type: "ref", ref: "#theme" },
        },
      },
    },
    theme: {
      type: "object",
      properties: {
        background: {
          type: "union",
          refs: [...ColorUnion.refs, PubLeafletThemeBackgroundImage.id],
        },
        primary: ColorUnion,
        page: ColorUnion,
        accentBackground: ColorUnion,
        accentText: ColorUnion,
      },
    },
  },
};

export const PubLeafletPublicationSubscription: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.graph.subscription",
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
