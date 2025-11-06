import { AtUri } from "@atproto/syntax";
import { Feed } from "feed";
import {
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
  PubLeafletPublication,
} from "lexicons/api";
import { createElement } from "react";
import { StaticPostContent } from "./[rkey]/StaticPostContent";
import { supabaseServerClient } from "supabase/serverClient";
import { NextResponse } from "next/server";

export async function generateFeed(
  did: string,
  publication_name: string,
): Promise<Feed | NextResponse<unknown>> {
  let renderToReadableStream = await import("react-dom/server").then(
    (module) => module.renderToReadableStream,
  );
  let uri;
  if (/^(?!\.$|\.\.S)[A-Za-z0-9._:~-]{1,512}$/.test(publication_name)) {
    uri = AtUri.make(
      did,
      "pub.leaflet.publication",
      publication_name,
    ).toString();
  }
  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select(
      `*,
        publication_subscriptions(*),
      documents_in_publications(documents(*))
      `,
    )
    .eq("identity_did", did)
    .or(`name.eq."${publication_name}", uri.eq."${uri}"`)
    .single();

  let pubRecord = publication?.record as PubLeafletPublication.Record;
  if (!publication || !pubRecord)
    return new NextResponse(null, { status: 404 });

  const feed = new Feed({
    title: pubRecord.name,
    description: pubRecord.description,
    id: `https://${pubRecord.base_path}`,
    link: `https://${pubRecord.base_path}`,
    language: "en", // optional, used only in RSS 2.0, possible values: http://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
    copyright: "",
    feedLinks: {
      rss: `https://${pubRecord.base_path}/rss`,
      atom: `https://${pubRecord.base_path}/atom`,
      json: `https://${pubRecord.base_path}/json`,
    },
  });

  await Promise.all(
    publication.documents_in_publications.map(async (doc) => {
      if (!doc.documents) return;
      let record = doc.documents?.data as PubLeafletDocument.Record;
      let uri = new AtUri(doc.documents?.uri);
      let rkey = uri.rkey;
      if (!record) return;
      let firstPage = record.pages[0];
      let blocks: PubLeafletPagesLinearDocument.Block[] = [];
      if (PubLeafletPagesLinearDocument.isMain(firstPage)) {
        blocks = firstPage.blocks || [];
      }
      let stream = await renderToReadableStream(
        createElement(StaticPostContent, { blocks, did: uri.host }),
      );
      const reader = stream.getReader();
      const chunks = [];

      let done, value;
      while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
          chunks.push(new TextDecoder().decode(value));
        }
      }

      feed.addItem({
        title: record.title,
        description: record.description,
        date: record.publishedAt ? new Date(record.publishedAt) : new Date(),
        id: `https://${pubRecord.base_path}/${rkey}`,
        link: `https://${pubRecord.base_path}/${rkey}`,
        content: chunks.join(""),
      });
    }),
  );

  return feed;
}
