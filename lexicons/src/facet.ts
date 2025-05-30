import { LexiconDoc } from "@atproto/lexicon";
const FacetItems: LexiconDoc["defs"] = {
  link: {
    type: "object",
    description:
      "Facet feature for a URL. The text URL may have been simplified or truncated, but the facet reference should be a complete URL.",
    required: ["uri"],
    properties: {
      uri: { type: "string", format: "uri" },
    },
  },
  highlight: {
    type: "object",
    description: "Facet feature for highlighted text.",
    required: [],
    properties: {},
  },
  underline: {
    type: "object",
    description: "Facet feature for underline markup",
    required: [],
    properties: {},
  },
  strikethrough: {
    type: "object",
    description: "Facet feature for strikethrough markup",
    required: [],
    properties: {},
  },
  bold: {
    type: "object",
    description: "Facet feature for bold text",
    required: [],
    properties: {},
  },
  italic: {
    type: "object",
    description: "Facet feature for italic text",
    required: [],
    properties: {},
  },
};

export const PubLeafletRichTextFacet = {
  lexicon: 1,
  id: "pub.leaflet.richtext.facet",
  defs: {
    main: {
      type: "object",
      description: "Annotation of a sub-string within rich text.",
      required: ["index", "features"],
      properties: {
        index: { type: "ref", ref: "#byteSlice" },
        features: {
          type: "array",
          items: {
            type: "union",
            refs: Object.keys(FacetItems).map((k) => `#${k}`),
          },
        },
      },
    },
    byteSlice: {
      type: "object",
      description:
        "Specifies the sub-string range a facet feature applies to. Start index is inclusive, end index is exclusive. Indices are zero-indexed, counting bytes of the UTF-8 encoded text. NOTE: some languages, like Javascript, use UTF-16 or Unicode codepoints for string slice indexing; in these languages, convert to byte arrays before working with facets.",
      required: ["byteStart", "byteEnd"],
      properties: {
        byteStart: { type: "integer", minimum: 0 },
        byteEnd: { type: "integer", minimum: 0 },
      },
    },
    ...FacetItems,
  },
};
