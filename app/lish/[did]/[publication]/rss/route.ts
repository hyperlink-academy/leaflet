import { AtUri } from "@atproto/syntax";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { Feed } from "feed";
import fs from "fs/promises";
import { PubLeafletDocument, PubLeafletPublication } from "lexicons/api";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerClient } from "supabase/serverClient";

export async function GET(
  req: Request,
  props: {
    params: Promise<{ publication: string; did: string }>;
  },
) {
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
    },
  });

  publication?.documents_in_publications.forEach((doc) => {
    if (!doc.documents) return;
    let record = doc.documents?.data as PubLeafletDocument.Record;
    let rkey = new AtUri(doc.documents?.uri).rkey;
    if (!record) return;
    feed.addItem({
      title: record.title,
      description: record.description,
      date: record.publishedAt ? new Date(record.publishedAt) : new Date(),
      id: `https://${pubRecord.base_path}/${rkey}`,
      link: `https://${pubRecord.base_path}/${rkey}`,
    });
  });
  return new Response(feed.rss2(), {
    headers: {
      "Content-Type": "application/rss+xml",
    },
  });
}
