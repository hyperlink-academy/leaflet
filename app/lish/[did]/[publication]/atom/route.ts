import { AtUri } from "@atproto/syntax";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { Feed } from "feed";
import fs from "fs/promises";
import {
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
  PubLeafletPublication,
} from "lexicons/api";
import { NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { supabaseServerClient } from "supabase/serverClient";
import { StaticPostContent } from "../[rkey]/StaticPostContent";

export async function GET(
  req: Request,
  props: {
    params: Promise<{ publication: string; did: string }>;
  },
) {
  let renderToReadableStream = await import("react-dom/server").then(
    (module) => module.renderToReadableStream,
  );
  let params = await props.params;
  let { result: publication } = await get_publication_data.handler(
    {
      did: params.did,
      publication_name: decodeURIComponent(params.publication),
    },
    { supabase: supabaseServerClient },
  );

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
    publication?.documents_in_publications.map(async (doc) => {
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
  return new Response(feed.atom1(), {
    headers: {
      "Content-Type": "application/atom+xml",
    },
  });
}
