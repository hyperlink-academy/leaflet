import { AtUri } from "@atproto/syntax";
import { Feed } from "feed";
import { PubLeafletPagesLinearDocument } from "lexicons/api";
import { createElement } from "react";
import { StaticPostContent } from "./[rkey]/StaticPostContent";
import { supabaseServerClient } from "supabase/serverClient";
import { NextResponse } from "next/server";
import {
  normalizePublicationRecord,
  normalizeDocumentRecord,
  hasLeafletContent,
} from "src/utils/normalizeRecords";
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import { getDocumentURL } from "app/lish/createPub/getPublicationURL";

export async function generateFeed(
  did: string,
  publication_name: string,
): Promise<Feed | NextResponse<unknown>> {
  let renderToReadableStream = await import("react-dom/server").then(
    (module) => module.renderToReadableStream,
  );
  let { data: publications, error } = await supabaseServerClient
    .from("publications")
    .select(
      `*,
        publication_subscriptions(*),
      documents_in_publications(documents(*))
      `,
    )
    .eq("identity_did", did)
    .or(publicationNameOrUriFilter(did, publication_name))
    .order("uri", { ascending: false })
    .limit(1);
  console.log(error);
  let publication = publications?.[0];

  const pubRecord = normalizePublicationRecord(publication?.record);
  if (!publication || !pubRecord)
    return new NextResponse(null, { status: 404 });

  const feed = new Feed({
    title: pubRecord.name,
    description: pubRecord.description,
    id: pubRecord.url,
    link: pubRecord.url,
    language: "en", // optional, used only in RSS 2.0, possible values: http://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
    copyright: "",
    feedLinks: {
      rss: `${pubRecord.url}/rss`,
      atom: `${pubRecord.url}/atom`,
      json: `${pubRecord.url}/json`,
    },
  });

  await Promise.all(
    publication.documents_in_publications.map(async (doc) => {
      if (!doc.documents) return;
      const record = normalizeDocumentRecord(
        doc.documents?.data,
        doc.documents?.uri,
      );
      const uri = new AtUri(doc.documents?.uri);
      const rkey = uri.rkey;
      if (!record) return;

      let blocks: PubLeafletPagesLinearDocument.Block[] = [];
      if (hasLeafletContent(record) && record.content.pages[0]) {
        const firstPage = record.content.pages[0];
        if (PubLeafletPagesLinearDocument.isMain(firstPage)) {
          blocks = firstPage.blocks || [];
        }
      }
      const stream = await renderToReadableStream(
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

      const docUrl = getDocumentURL(record, doc.documents.uri, pubRecord);
      feed.addItem({
        title: record.title,
        description: record.description,
        date: record.publishedAt ? new Date(record.publishedAt) : new Date(),
        id: docUrl,
        link: docUrl,
        content: chunks.join(""),
      });
    }),
  );

  return feed;
}
