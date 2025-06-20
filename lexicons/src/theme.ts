import { LexiconDoc, LexRefUnion } from "@atproto/lexicon";

export const PubLeafletThemeBackgroundImage = {
  lexicon: 1,
  id: "pub.leaflet.theme.backgroundImage",
  defs: {
    main: {
      type: "object",
      required: ["image"],
      properties: {
        image: {
          type: "blob",
          accept: ["image/*"],
          maxSize: 1000000,
        },
        width: { type: "integer" },
        repeat: { type: "boolean" },
      },
    },
  },
};
export const PubLeafletThemeColor: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.theme.color",
  defs: {
    rgba: {
      type: "object",
      properties: {
        r: { type: "integer", maximum: 255, minimum: 0 },
        g: { type: "integer", maximum: 255, minimum: 0 },
        b: { type: "integer", maximum: 255, minimum: 0 },
        a: { type: "integer", maximum: 100, minimum: 0 },
      },
    },
    rgb: {
      type: "object",
      properties: {
        r: { type: "integer", maximum: 255, minimum: 0 },
        g: { type: "integer", maximum: 255, minimum: 0 },
        b: { type: "integer", maximum: 255, minimum: 0 },
      },
    },
  },
};

export const ThemeLexicons = [
  PubLeafletThemeBackgroundImage,
  PubLeafletThemeColor,
];

export const ColorUnion: LexRefUnion = {
  type: "union",
  refs: Object.keys(PubLeafletThemeColor.defs).map(
    (key) => `${PubLeafletThemeColor.id}#${key}`,
  ),
};
