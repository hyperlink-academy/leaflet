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
        display: { type: "string", knownValues: ["full", "compact"] },
      },
    },
  },
};

export const PubLeafletBlocksEmbeddedCanvas: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.embeddedCanvas",
  defs: {
    main: {
      type: "object",
      required: ["id"],
      description:
        "A fixed-size canvas shown in full inline. id refers to a pub.leaflet.pages.canvas in the document's pages whose width and height bound it.",
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
        clientHost: { type: "string" },
      },
    },
  },
};

export const PubLeafletBlocksStandardSitePost: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.standardSitePost",
  defs: {
    main: {
      type: "object",
      required: ["uri"],
      properties: {
        uri: { type: "string", format: "at-uri" },
        cid: { type: "string" },
        size: { type: "string", knownValues: ["large", "medium", "small"] },
        showPublicationTheme: { type: "boolean" },
      },
    },
  },
};

export const PubLeafletBlocksStandardSitePublication: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.standardSitePublication",
  defs: {
    main: {
      type: "object",
      required: ["uri"],
      properties: {
        uri: { type: "string", format: "at-uri" },
        cid: { type: "string" },
        showPublicationTheme: { type: "boolean" },
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
        fullBleed: {
          type: "boolean",
          description:
            "Whether the image should extend to the full width of the container, ignoring padding.",
        },
        width: {
          type: "integer",
          description:
            "Display width of the image in pixels, capped at the page width.",
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

export const PubLeafletBlocksImageGallery: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.imageGallery",
  defs: {
    main: {
      type: "object",
      required: ["images"],
      properties: {
        images: {
          type: "array",
          items: { type: "ref", ref: "#image" },
        },
        format: {
          type: "string",
          knownValues: ["grid", "carousel", "strip"],
        },
        gap: {
          type: "integer",
          description: "Gap between images in pixels.",
        },
        maxWidth: {
          type: "integer",
          description:
            "Max width per image in grid view (px); drives how many columns fit.",
        },
      },
    },
    image: {
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
          description:
            "The starting number for this ordered list. Defaults to 1 if not specified.",
        },
        children: { type: "array", items: { type: "ref", ref: "#listItem" } },
      },
    },
    listItem: {
      type: "object",
      required: ["content"],
      properties: {
        checked: {
          type: "boolean",
          description:
            "If present, this item is a checklist item. true = checked, false = unchecked. If absent, this is a normal list item.",
        },
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
          description:
            "Nested ordered list items. Mutually exclusive with unorderedListChildren; if both are present, children takes precedence.",
          items: { type: "ref", ref: "#listItem" },
        },
        unorderedListChildren: {
          type: "ref",
          description:
            "A nested unordered list. Mutually exclusive with children; if both are present, children takes precedence.",
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
        checked: {
          type: "boolean",
          description:
            "If present, this item is a checklist item. true = checked, false = unchecked. If absent, this is a normal list item.",
        },
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
          description:
            "Nested unordered list items. Mutually exclusive with orderedListChildren; if both are present, children takes precedence.",
          items: { type: "ref", ref: "#listItem" },
        },
        orderedListChildren: {
          type: "ref",
          description:
            "Nested ordered list items. Mutually exclusive with children; if both are present, children takes precedence.",
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
      properties: {
        url: { type: "string", format: "uri" },
        html: {
          type: "string",
          description:
            "DEPRECATED — use pub.leaflet.blocks.html instead. Inline HTML rendered via the iframe's srcdoc attribute. Takes precedence over url.",
        },
        height: { type: "integer", minimum: 16, maximum: 1600 },
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

export const PubLeafletBlocksHtml: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.html",
  defs: {
    main: {
      type: "object",
      required: ["html"],
      properties: {
        html: {
          type: "string",
          description:
            "Inline HTML rendered via a sandboxed iframe's srcdoc attribute.",
        },
        height: { type: "integer", minimum: 16, maximum: 1600 },
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

export const PubLeafletBlocksPostsList: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.postsList",
  defs: {
    main: {
      type: "object",
      required: [],
      properties: {
        view: { type: "string", knownValues: ["small", "medium", "chapter"] },
        highlightFirstPost: { type: "boolean" },
        showPageCount: {
          type: "boolean",
          default: true,
          description:
            "In the chapter view, show the number of pages under each chapter.",
        },
        filterByTags: { type: "array", items: { type: "string" } },
        limit: {
          type: "integer",
          minimum: 1,
          description: "Show at most this many posts.",
        },
        readerControls: {
          type: "boolean",
          description:
            "Show reader-facing controls above the list. The readerSearch / readerTagFilter / readerSort flags pick which ones; each defaults to true when this is set.",
        },
        readerSearch: { type: "boolean" },
        readerTagFilter: { type: "boolean" },
        readerSort: { type: "boolean" },
      },
    },
  },
};

export const PubLeafletBlocksRecommendedPubs: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.recommendedPubs",
  defs: {
    main: {
      type: "object",
      description:
        "The publications this publication recommends, resolved at render time from its recommendations rather than stored on the block.",
      required: [],
      properties: {
        compact: {
          type: "boolean",
          description:
            "Lay the recommendations out as a single side-scrolling row instead of a grid.",
        },
      },
    },
  },
};

export const PubLeafletBlocksMembersOnlyDelimiter: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.membersOnlyDelimiter",
  defs: {
    main: {
      type: "object",
      description:
        "Marks where members-only content begins and declares which publication members can read past it.",
      required: ["audience"],
      properties: {
        audience: {
          type: "string",
          knownValues: ["subscribers", "paid", "tiers"],
          description:
            "Whether access is available to all subscribers, all paid members, or selected paid tiers.",
        },
        tierIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Paid tier ids that grant access when audience is tiers. An empty selection grants no membership access.",
        },
      },
    },
  },
};

export const PubLeafletBlocksSignup: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.signup",
  defs: {
    main: {
      type: "object",
      description:
        "A subscribe/signup form for the publication. Renders the publication's subscribe form; carries no configurable data.",
      required: [],
      properties: {},
    },
  },
};

export const PubLeafletBlocksPostHeader: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.postHeader",
  defs: {
    main: {
      type: "object",
      description:
        "The post's header (publication, title, description, byline) placed as a block, so canvas posts can position it. Renders the document's own metadata; carries no content of its own.",
      required: [],
      properties: {
        compact: {
          type: "boolean",
          description:
            "Show a condensed header: title and byline only, without the description.",
        },
      },
    },
  },
};

export const PubLeafletBlocksDrawing: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.blocks.drawing",
  defs: {
    main: {
      type: "object",
      description:
        "Freehand ink strokes. The view box is the area of drawing space the block shows, scaled to the block's width; strokes may reach past it.",
      required: ["viewBox", "strokes"],
      properties: {
        viewBox: { type: "ref", ref: "#viewBox" },
        strokes: { type: "array", items: { type: "ref", ref: "#stroke" } },
      },
    },
    viewBox: {
      type: "object",
      required: ["x", "y", "width", "height"],
      properties: {
        x: { type: "integer" },
        y: { type: "integer" },
        width: { type: "integer", minimum: 1 },
        height: { type: "integer", minimum: 1 },
      },
    },
    stroke: {
      type: "object",
      description:
        "One pen stroke, drawn in order, rendered as a variable-width outline of its input points (as perfect-freehand does).",
      required: ["points", "color", "size"],
      properties: {
        points: {
          type: "array",
          items: { type: "integer" },
          description:
            "Flattened input points as x, y, pressure triples: x and y in drawing space, pressure from 0 to 1000.",
        },
        color: {
          type: "string",
          description:
            "A CSS hex color, or one of the document theme's colors: primary (text), accent, or tertiary (faded text).",
        },
        size: {
          type: "integer",
          minimum: 1,
          description: "The stroke's base diameter in drawing space.",
        },
        simulatePressure: {
          type: "boolean",
          description:
            "The input had no real pressure (a mouse or finger); derive it from the stroke's speed instead.",
        },
      },
    },
  },
};

export const BlockLexicons = [
  PubLeafletBlocksIFrame,
  PubLeafletBlocksHtml,
  PubLeafletBlocksText,
  PubLeafletBlocksBlockQuote,
  PubLeafletBlocksHeader,
  PubLeafletBlocksImage,
  PubLeafletBlocksImageGallery,
  PubLeafletBlocksUnorderedList,
  PubLeafletBlocksOrderedList,
  PubLeafletBlocksWebsite,
  PubLeafletBlocksMath,
  PubLeafletBlocksCode,
  PubLeafletBlocksHorizontalRule,
  PubLeafletBlocksBskyPost,
  PubLeafletBlocksStandardSitePost,
  PubLeafletBlocksStandardSitePublication,
  PubLeafletBlocksPage,
  PubLeafletBlocksEmbeddedCanvas,
  PubLeafletBlocksPoll,
  PubLeafletBlocksButton,
  PubLeafletBlocksPostsList,
  PubLeafletBlocksSignup,
  PubLeafletBlocksRecommendedPubs,
  PubLeafletBlocksMembersOnlyDelimiter,
  PubLeafletBlocksPostHeader,
  PubLeafletBlocksDrawing,
];
export const BlockUnion: LexRefUnion = {
  type: "union",
  refs: [...BlockLexicons.map((lexicon) => lexicon.id)],
};
