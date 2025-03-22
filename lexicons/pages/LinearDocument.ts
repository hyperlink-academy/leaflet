import { BlockUnion } from "../blocks";
import * as l from "../utils";

const textAlignRefs = {
  id: "ignore",
  defs: {
    textAlignLeft: l.token(),
    textAlignCenter: l.token(),
    textAlignRight: l.token(),
  },
};

export const PubLeafletPagesLinearDocument = l.lexicon({
  id: "pub.leaflet.pages.linearDocument",
  defs: {
    main: l.object({
      properties: {
        blocks: { type: "array", items: l.ref("#block") },
      },
    }),
    block: l.object({
      required: ["block"],
      properties: {
        block: BlockUnion,
        alignment: l.string({
          knownValues: [
            l.refValue<typeof textAlignRefs>(null, "textAlignLeft"),
            l.refValue<typeof textAlignRefs>(null, "textAlignCenter"),
            l.refValue<typeof textAlignRefs>(null, "textAlignRight"),
          ],
        }),
      },
    }),
    ...textAlignRefs.defs,
  },
});
