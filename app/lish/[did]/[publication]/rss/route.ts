import { NextResponse } from "next/server";
import { generateFeed } from "../layout";

export async function GET(
  req: Request,
  props: {
    params: Promise<{ publication: string; did: string }>;
  },
) {
  let renderToReadableStream = await import("react-dom/server").then(
    (module) => module.renderToReadableStream,
  );
  const params = await props.params;
  const did = decodeURIComponent(params.did);
  const publication = decodeURIComponent(params.publication);
  const feed = await generateFeed(did, publication);

  if (feed instanceof NextResponse) {
    return feed;
  }

  return new Response(feed.rss2(), {
    headers: {
      "Content-Type": "application/rss+xml",
    },
  });
}
