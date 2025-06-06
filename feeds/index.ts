import { Hono, HonoRequest } from "hono";
import { serve } from "@hono/node-server";
import { DidResolver } from "@atproto/identity";
import { parseReqNsid, verifyJwt } from "@atproto/xrpc-server";
import { supabaseServerClient } from "supabase/serverClient";
import { PubLeafletDocument } from "lexicons/api";

const app = new Hono();

const domain = "feeds.leaflet.pub";
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

  let { data: publications } = await supabaseServerClient
    .from("publication_subscriptions")
    .select(`publications(documents_in_publications(documents(*)))`)
    .eq("identity", auth);
  const feed = (publications || []).flatMap((pub) => {
    let posts = pub.publications?.documents_in_publications || [];
    return posts.flatMap((p) => {
      if (!p.documents?.data) return [];
      let record = p.documents.data as PubLeafletDocument.Record;
      if (!record.postRef) return [];
      return { post: record.postRef.uri };
    });
  });

  return c.json({
    feed,
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

serve(app);
