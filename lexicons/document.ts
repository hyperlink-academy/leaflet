import { PubLeafletPagesLinearDocument } from "./pages/LinearDocument";
import * as l from "./utils";

export const PubLeafletDocument = l.lexicon({
  id: "pub.leaflet.document",
  revision: 1,
  description: "A lexicon for long form rich media documents",
  defs: {
    main: l.record({
      key: "tid",
      description: "Record containing a document",
      record: l.object({
        required: ["pages", "author", "title", "publication"],
        properties: {
          title: l.string({ maxLength: 128 }),
          publishedAt: l.string({ format: "datetime" }),
          publication: l.string({ format: "at-uri" }),
          author: l.string({ format: "at-identifier" }),
          pages: l.array({
            items: l.union({ refs: [PubLeafletPagesLinearDocument.id] }),
          }),
        },
      }),
    }),
  },
});
