import { NextResponse } from "next/server";
import { generateFeed } from "../generateFeed";
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

  return feedResponse(req, feed.atom1(), "application/atom+xml");
}
