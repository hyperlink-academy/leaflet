import { LexiconDoc } from "@atproto/lexicon";
import { BlockUnion } from "../blocks";

export const PubLeafletPagesLinearDocument: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.pages.linearDocument",
  defs: {
    main: {
      type: "object",
      properties: {
        blocks: { type: "array", items: { type: "ref", ref: "#block" } },
      },
    },
    block: {
      type: "object",
      required: ["block"],
      properties: {
        block: BlockUnion,
        alignment: {
          type: "string",
          knownValues: [
            "#textAlignLeft",
            "#textAlignCenter",
            "#textAlignRight",
          ],
        },
      },
    },
    textAlignLeft: { type: "token" },
    textAlignCenter: { type: "token" },
    textAlignRight: { type: "token" },
    quote: {
      type: "object",
      required: ["start", "end"],
      properties: {
        start: { type: "ref", ref: "#position" },
        end: { type: "ref", ref: "#position" },
      },
    },
    position: {
      type: "object",
      required: ["block", "offset"],
      properties: {
        block: { type: "array", items: { type: "integer" } },
        offset: { type: "integer" },
      },
    },
  },
};
