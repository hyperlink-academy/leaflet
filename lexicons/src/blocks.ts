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
        textSize: { type: "string", enum: ["default", "small", "large"] },
        facets: {
          type: "array",
          items: { type: "ref", ref: PubLeafletRichTextFacet.id },
        },
      },
    },
  },
};

export const PubLeafletBlocksPage: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.page",
  defs: {
    main: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" },
      },
    },
  },
};

export const PubLeafletBlocksBskyPost: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.bskyPost",
  defs: {
    main: {
      type: "object",
      required: ["postRef"],
      properties: {
        postRef: { type: "ref", ref: "com.atproto.repo.strongRef" },
      },
    },
  },
};

export const PubLeafletBlocksBlockQuote: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.blockquote",
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

export const PubLeafletBlocksHorizontalRule: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.horizontalRule",
  defs: {
    main: {
      type: "object",
      required: [],
      properties: {},
    },
  },
};

export const PubLeafletBlocksCode: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.code",
  defs: {
    main: {
      type: "object",
      required: ["plaintext"],
      properties: {
        plaintext: { type: "string" },
        language: { type: "string" },
        syntaxHighlightingTheme: { type: "string" },
      },
    },
  },
};

export const PubLeafletBlocksMath: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.math",
  defs: {
    main: {
      type: "object",
      required: ["tex"],
      properties: {
        tex: { type: "string" },
      },
    },
  },
};

export const PubLeafletBlocksLeafletQuote: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.leafletQuote",
  defs: {
    main: {
      type: "object",
      required: ["src"],
      properties: {
        record: { type: "ref", ref: "com.atproto.repo.strongRef" },
        position: {
          type: "union",
          refs: ["pub.leaflet.pages.linearDocument#quote"],
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

export const PubLeafletBlocksOrderedList: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.orderedList",
  defs: {
    main: {
      type: "object",
      required: ["children"],
      properties: {
        startIndex: {
          type: "integer",
          description: "The starting number for this ordered list. Defaults to 1 if not specified.",
        },
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
        children: {
          type: "array",
          description: "Nested ordered list items. Mutually exclusive with unorderedListChildren; if both are present, children takes precedence.",
          items: { type: "ref", ref: "#listItem" },
        },
        unorderedListChildren: {
          type: "ref",
          description: "A nested unordered list. Mutually exclusive with children; if both are present, children takes precedence.",
          ref: "pub.leaflet.blocks.unorderedList",
        },
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
        children: {
          type: "array",
          description: "Nested unordered list items. Mutually exclusive with orderedListChildren; if both are present, children takes precedence.",
          items: { type: "ref", ref: "#listItem" },
        },
        orderedListChildren: {
          type: "ref",
          description: "Nested ordered list items. Mutually exclusive with children; if both are present, children takes precedence.",
          ref: "pub.leaflet.blocks.orderedList",
        },
      },
    },
  },
};

export const PubLeafletBlocksIFrame: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.iframe",
  defs: {
    main: {
      type: "object",
      required: ["url"],
      properties: {
        url: { type: "string", format: "uri" },
        height: { type: "integer", minimum: 16, maximum: 1600 },
      },
    },
  },
};

export const PubLeafletBlocksPoll: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.poll",
  defs: {
    main: {
      type: "object",
      required: ["pollRef"],
      properties: {
        pollRef: { type: "ref", ref: "com.atproto.repo.strongRef" },
      },
    },
  },
};

export const PubLeafletBlocksButton: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.button",
  defs: {
    main: {
      type: "object",
      required: ["text", "url"],
      properties: {
        text: { type: "string" },
        url: { type: "string", format: "uri" },
      },
    },
  },
};

export const BlockLexicons = [
  PubLeafletBlocksIFrame,
  PubLeafletBlocksText,
  PubLeafletBlocksBlockQuote,
  PubLeafletBlocksHeader,
  PubLeafletBlocksImage,
  PubLeafletBlocksUnorderedList,
  PubLeafletBlocksOrderedList,
  PubLeafletBlocksWebsite,
  PubLeafletBlocksMath,
  PubLeafletBlocksCode,
  PubLeafletBlocksHorizontalRule,
  PubLeafletBlocksBskyPost,
  PubLeafletBlocksPage,
  PubLeafletBlocksPoll,
  PubLeafletBlocksButton,
];
export const BlockUnion: LexRefUnion = {
  type: "union",
  refs: [...BlockLexicons.map((lexicon) => lexicon.id)],
};
