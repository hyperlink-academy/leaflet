import { Hono, HonoRequest } from "hono";
import { serve } from "@hono/node-server";
import { DidResolver } from "@atproto/identity";
import { parseReqNsid, verifyJwt } from "@atproto/xrpc-server";
import { supabaseServerClient } from "supabase/serverClient";
import { PubLeafletDocument } from "lexicons/api";

const app = new Hono();

const domain = process.env.FEED_SERVICE_URL || "feeds.leaflet.pub";
const serviceDid = `did:web:${domain}`;

app.get("/.well-known/did.json", (c) => {
  return c.json({
    "@context": ["https://www.w3.org/ns/did/v1"],
    id: serviceDid,
    service: [
      {
        id: "#bsky_fg",
        type: "BskyFeedGenerator",
        serviceEndpoint: `https://${domain}`,
      },
    ],
  });
});
app.get("/xrpc/app.bsky.feed.getFeedSkeleton", async (c) => {
  let auth = await validateAuth(c.req, serviceDid);
  if (!auth) return c.json({ feed: [] });
  let cursor = c.req.query("cursor");
  let limit = parseInt(c.req.query("limit") || "10");

  let { data: publications } = await supabaseServerClient
    .from("publication_subscriptions")
    .select(`publications(documents_in_publications(documents(*)))`)
    .eq("identity", auth);

  const allPosts = (publications || [])
    .flatMap((pub) => {
      let posts = pub.publications?.documents_in_publications || [];
      return posts;
    })
    .sort((a, b) => {
      let aRecord = a.documents?.data! as PubLeafletDocument.Record;
      let bRecord = b.documents?.data! as PubLeafletDocument.Record;
      const aDate = aRecord.publishedAt
        ? new Date(aRecord.publishedAt)
        : new Date(0);
      const bDate = bRecord.publishedAt
        ? new Date(bRecord.publishedAt)
        : new Date(0);
      return bDate.getTime() - aDate.getTime(); // Sort by most recent first
    })
    .flatMap((p) => {
      if (!p.documents?.data) return [];
      let record = p.documents.data as PubLeafletDocument.Record;
      if (!record.postRef) return [];
      return { post: record.postRef.uri, id: p.documents.uri };
    });

  // Find starting index based on cursor
  let startIndex = 0;
  if (cursor) {
    const cursorIndex = allPosts.findIndex((p) => p.id === cursor);
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }

  // Get the limited posts
  const limitedPosts = allPosts.slice(startIndex, startIndex + limit);
  const feed = limitedPosts.map((p) => ({ post: p.post }));

  // Set cursor to the id of the last post if there are more posts
  let nextCursor;
  if (startIndex + limit < allPosts.length && limitedPosts.length > 0) {
    nextCursor = limitedPosts[limitedPosts.length - 1].id;
  }

  return c.json({
    feed,
    ...(nextCursor && { cursor: nextCursor }),
  });
});

const didResolver = new DidResolver({});
const validateAuth = async (
  req: HonoRequest,
  serviceDid: string,
): Promise<string | null> => {
  const authorization = req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  const jwt = authorization.replace("Bearer ", "").trim();
  const nsid = parseReqNsid({ url: req.path });
  const parsed = await verifyJwt(jwt, serviceDid, nsid, async (did: string) => {
    return didResolver.resolveAtprotoKey(did);
  });
  return parsed.iss;
};

serve({ fetch: app.fetch, port: 3030 });
