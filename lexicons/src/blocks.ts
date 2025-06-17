import { LexiconDoc, LexRefUnion } from "@atproto/lexicon";
import { PubLeafletRichTextFacet } from "./facet";

export const PubLeafletBlocksText: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.text",
  defs: {
    main: {
      type: "object",
      required: ["plaintext"],
      properties: {
        plaintext: { type: "string" },
        facets: {
          type: "array",
          items: { type: "ref", ref: PubLeafletRichTextFacet.id },
        },
      },
    },
  },
};

export const PubLeafletBlocksWebsite: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.website",
  defs: {
    main: {
      type: "object",
      required: ["src"],
      properties: {
        previewImage: { type: "blob", accept: ["image/*"], maxSize: 1000000 },
        title: { type: "string" },
        description: { type: "string" },
        src: { type: "string", format: "uri" },
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
      required: ["plaintext"],
      properties: {
        level: { type: "integer", minimum: 1, maximum: 6 },
        plaintext: { type: "string" },
        facets: {
          type: "array",
          items: { type: "ref", ref: PubLeafletRichTextFacet.id },
        },
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

export const PubLeafletBlocksUnorderedList: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.unorderedList",
  defs: {
    main: {
      type: "object",
      required: ["children"],
      properties: {
        children: { type: "array", items: { type: "ref", ref: "#listItem" } },
      },
    },
    listItem: {
      type: "object",
      required: ["content"],
      properties: {
        content: {
          type: "union",
          refs: [
            PubLeafletBlocksText,
            PubLeafletBlocksHeader,
            PubLeafletBlocksImage,
          ].map((l) => l.id),
        },
        children: { type: "array", items: { type: "ref", ref: "#listItem" } },
      },
    },
  },
};
export const BlockLexicons = [
  PubLeafletBlocksText,
  PubLeafletBlocksHeader,
  PubLeafletBlocksImage,
  PubLeafletBlocksUnorderedList,
  PubLeafletBlocksWebsite,
];
export const BlockUnion: LexRefUnion = {
  type: "union",
  refs: [...BlockLexicons.map((lexicon) => lexicon.id)],
};
