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
          base_path: { type: "string" },
          description: { type: "string", maxLength: 2000 },
          icon: { type: "blob", accept: ["image/*"], maxSize: 1000000 },
          theme: { type: "ref", ref: "#theme" },
          preferences: { type: "ref", ref: "#preferences" },
        },
      },
    },
    preferences: {
      type: "object",
      properties: {
        showInDiscover: { type: "boolean", default: true },
        showComments: { type: "boolean", default: true },
        showMentions: { type: "boolean", default: true },
        showPrevNext: { type: "boolean", default: true },
      },
    },
    theme: {
      type: "object",
      properties: {
        backgroundColor: ColorUnion,
        backgroundImage: {
          type: "ref",
          ref: PubLeafletThemeBackgroundImage.id,
        },
        pageWidth: {
          type: "integer",
          minimum: 0,
          maximum: 1600,
        },
        primary: ColorUnion,
        pageBackground: ColorUnion,
        showPageBackground: { type: "boolean", default: false },
        accentBackground: ColorUnion,
        accentText: ColorUnion,
        headingFont: { type: "string", maxLength: 100 },
        bodyFont: { type: "string", maxLength: 100 },
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
