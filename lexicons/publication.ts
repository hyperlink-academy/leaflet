import * as l from "./utils";
export const PubLeafletPublication = l.lexicon({
  id: "pub.leaflet.publication",
  defs: {
    main: l.record({
      key: "tid",
      description: "Record declaring a publication",
      record: l.object({
        required: ["name"],
        properties: {
          name: l.string({ maxLength: 2000 }),
          description: l.string({ maxLength: 2000 }),
        },
      }),
    }),
  },
});

export const PubLeafletPublicationPost = l.lexicon({
  id: "pub.leaflet.post",
  defs: {
    main: l.record({
      key: "tid",
      description: "Record putting a post in a document",
      record: l.object({
        required: ["post", "publishedAt"],
        properties: {
          publication: l.string({ format: "at-uri" }),
          post: { type: "ref", ref: "com.atproto.repo.strongRef" },
          publishedAt: { type: "string", format: "datetime" },
        },
      }),
    }),
  },
});
