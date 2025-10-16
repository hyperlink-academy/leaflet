import { Hono, HonoRequest } from "hono";
import { serve } from "@hono/node-server";
import { DidResolver } from "@atproto/identity";
import { parseReqNsid, verifyJwt } from "@atproto/xrpc-server";
import { supabaseServerClient } from "supabase/serverClient";
import { PubLeafletDocument } from "lexicons/api";
import { inngest } from "app/api/inngest/client";
import { AtUri } from "@atproto/api";

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
//Cursor format ts::uri

app.get("/xrpc/app.bsky.feed.getFeedSkeleton", async (c) => {
  let auth = await validateAuth(c.req, serviceDid);
  let feed = c.req.query("feed");
  if (!auth || !feed) return c.json({ feed: [] });
  let cursor = c.req.query("cursor");
  let parsedCursor;
  if (cursor) {
    let date = cursor.split("::")[0];
    let uri = cursor.split("::")[1];
    parsedCursor = { date, uri };
  }
  let limit = parseInt(c.req.query("limit") || "10");
  let feedAtURI = new AtUri(feed);
  let posts;
  let query;
  if (feedAtURI.rkey === "bsky-follows-leaflets") {
    console.log(cursor);
    if (!cursor) {
      console.log("Sending event");
      await inngest.send({ name: "feeds/index-follows", data: { did: auth } });
    }
    query = supabaseServerClient
      .from("documents")
      .select(
        `*,
         documents_in_publications!inner(
           publications!inner(*,
             identities!publications_identity_did_fkey!inner(
               bsky_follows!bsky_follows_follows_fkey!inner(*)
              )
            )
          )`,
      )
      .eq(
        "documents_in_publications.publications.identities.bsky_follows.identity",
        auth,
      )
      .not("data -> postRef", "is", null)
      .order("indexed_at", { ascending: false })
      .limit(25);
  } else {
    query = supabaseServerClient
      .from("documents")
      .select(
        `*,
          documents_in_publications!inner(publications!inner(*, publication_subscriptions!inner(*)))`,
      )
      .eq(
        "documents_in_publications.publications.publication_subscriptions.identity",
        auth,
      )
      .not("data -> postRef", "is", null)
      .order("indexed_at", { ascending: false })
      .order("uri", { ascending: false })
      .limit(25);
  }
  if (parsedCursor)
    query.or(
      `indexed_at.lt.${parsedCursor.date},and(indexed_at.eq.${parsedCursor.date},uri.lt.${parsedCursor.uri})`,
    );

  let { data } = await query;
  posts = data;

  posts = posts || [];

  let lastPost = posts[posts.length - 1];
  let newCursor = lastPost ? `${lastPost.indexed_at}::${lastPost.uri}` : null;
  return c.json({
    cursor: newCursor || cursor,
    feed: posts.flatMap((p) => {
      if (!p.data) return [];
      let record = p.data as PubLeafletDocument.Record;
      if (!record.postRef) return [];
      return { post: record.postRef.uri };
    }),
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
