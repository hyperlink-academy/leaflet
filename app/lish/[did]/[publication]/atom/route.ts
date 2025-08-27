import { NextResponse } from "next/server";
import { generateFeed } from "../generateFeed";

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

  return new Response(feed.atom1(), {
    headers: {
      "Content-Type": "application/atom+xml",
      "CDN-Cache-Control": "s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
