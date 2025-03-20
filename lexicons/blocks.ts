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

export const PubLeafletBlocksHeader = l.lexicon({
  id: "pub.leaflet.blocks.lexicon",
  defs: {
    main: l.object({
      required: [],
      properties: {
        level: l.integer({ minimum: 1, maximum: 6 }),
        plaintext: l.string(),
      },
    }),
  },
});

export const PubLeafletBlocksImage = l.lexicon({
  id: "pub.leaflet.blocks.image",
  defs: {
    main: l.object({
      required: ["image"],
      properties: {
        image: l.blob({ accept: ["image/*"], maxSize: 1000000 }),
        alt: {
          type: "string",
          description: "Alt text description of the image, for accessibility.",
        },
        aspectRatio: {
          type: "ref",
          ref: "#aspectRatio",
        },
      },
    }),
    aspectRatio: l.object({
      required: ["width", "height"],
      properties: {
        width: l.integer(),
        height: l.integer(),
      },
    }),
  },
});

export const BlockUnion = l.union({ refs: [PubLeafletBlocksText.id] });
