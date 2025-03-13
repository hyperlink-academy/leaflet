import * as l from "./utils";

export const PubLeafletBlocksText = l.lexicon({
  id: "pub.leaflet.blocks.text",
  defs: {
    main: l.object({
      required: [],
      properties: {
        plaintext: l.string(),
      },
    }),
  },
});

export const BlockUnion = l.union({ refs: [PubLeafletBlocksText.id] });
