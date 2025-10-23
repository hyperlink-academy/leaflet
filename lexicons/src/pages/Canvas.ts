import { LexiconDoc } from "@atproto/lexicon";
import { BlockUnion } from "../blocks";

export const PubLeafletPagesCanvasDocument: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.pages.canvas",
  defs: {
    main: {
      type: "object",
      required: ["blocks"],
      properties: {
        id: { type: "string" },
        blocks: { type: "array", items: { type: "ref", ref: "#block" } },
      },
    },
    block: {
      type: "object",
      required: ["block", "x", "y", "width"],
      properties: {
        block: BlockUnion,
        x: { type: "integer" },
        y: { type: "integer" },
        width: { type: "integer" },
        height: { type: "integer" },
        rotation: { type: "integer" },
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
