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
  },
};
