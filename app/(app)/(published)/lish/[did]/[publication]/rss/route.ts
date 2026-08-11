import { NextResponse } from "next/server";
import { generateFeed } from "../generateFeed";
import {
  collapseInterTagWhitespace,
  markGuidsAsPermalinks,
} from "../feedXml";
import { feedResponse } from "../feedResponse";

export async function GET(
  req: Request,
  props: {
    params: Promise<{ publication: string; did: string }>;
  },
) {
  const params = await props.params;
  const did = decodeURIComponent(params.did);
  const publication = decodeURIComponent(params.publication);
  const feed = await generateFeed(did, publication);

  if (feed instanceof NextResponse) {
    return feed;
  }

  return feedResponse(
    req,
    markGuidsAsPermalinks(collapseInterTagWhitespace(feed.rss2())),
    // The explicit charset guards against consumers that decode HTTP bodies
    // as Latin-1 when the Content-Type doesn't say otherwise.
    "application/rss+xml; charset=utf-8",
    feed.options.updated,
  );
}
