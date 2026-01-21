import { LexiconDoc } from "@atproto/lexicon";
import { PubLeafletPagesLinearDocument } from "./pages/LinearDocument";
import { PubLeafletPagesCanvasDocument } from "./pages";

export const PubLeafletContent: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.content",
  revision: 1,
  description: "A lexicon for long form rich media documents",
  defs: {
    main: {
      type: "object",
      description: "Content format for leaflet documents",
      required: ["pages"],
      properties: {
        pages: {
          type: "array",
          items: {
            type: "union",
            refs: [
              PubLeafletPagesLinearDocument.id,
              PubLeafletPagesCanvasDocument.id,
            ],
          },
        },
      },
    },
  },
};
