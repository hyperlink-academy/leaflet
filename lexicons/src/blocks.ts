import { LexiconDoc, LexRefUnion } from "@atproto/lexicon";

export const PubLeafletBlocksText: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.text",
  defs: {
    main: {
      type: "object",
      required: [],
      properties: {
        plaintext: { type: "string" },
      },
    },
  },
};

export const PubLeafletBlocksHeader: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.header",
  defs: {
    main: {
      type: "object",
      required: [],
      properties: {
        level: { type: "integer", minimum: 1, maximum: 6 },
        plaintext: { type: "string" },
      },
    },
  },
};

export const PubLeafletBlocksImage: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.image",
  defs: {
    main: {
      type: "object",
      required: ["image", "aspectRatio"],
      properties: {
        image: { type: "blob", accept: ["image/*"], maxSize: 1000000 },
        alt: {
          type: "string",
          description: "Alt text description of the image, for accessibility.",
        },
        aspectRatio: {
          type: "ref",
          ref: "#aspectRatio",
        },
      },
    },
    aspectRatio: {
      type: "object",
      required: ["width", "height"],
      properties: {
        width: { type: "integer" },
        height: { type: "integer" },
      },
    },
  },
};

export const BlockLexicons = [
  PubLeafletBlocksText,
  PubLeafletBlocksHeader,
  PubLeafletBlocksImage,
];
export const BlockUnion: LexRefUnion = {
  type: "union",
  refs: BlockLexicons.map((lexicon) => lexicon.id),
};
