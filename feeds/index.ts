import { Hono, HonoRequest } from "hono";
import { serve } from "@hono/node-server";
import { DidResolver, MemoryCache } from "@atproto/identity";
import { parseReqNsid, verifyJwt } from "@atproto/xrpc-server";
import { supabaseServerClient } from "supabase/serverClient";
import { inngest } from "app/api/inngest/client";
import { AtUri } from "@atproto/api";
import { wikipedia } from "../mentions/services/wikipedia";
import { pokemon } from "../mentions/services/pokemon";

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
      {
        id: "#mention_search",
        type: "MentionSearchService",
        serviceEndpoint: `https://${domain}`,
      },
    ],
  });
});

// Mention search services, keyed by rkey
const mentionServices: Record<
  string,
  (search: string, limit: number) => Promise<{ uri: string; name: string; href?: string; icon?: string; embed?: { src: string; width?: number; height?: number } }[]>
> = {
  wikipedia,
  pokemon,
};

app.get("/xrpc/parts.page.mention.search", async (c) => {
  const serviceUri = c.req.query("service");
  const search = c.req.query("search");
  const limit = Math.min(
    Math.max(parseInt(c.req.query("limit") || "20"), 1),
    50,
  );

  if (!serviceUri || !search) {
    return c.json({ error: "missing required parameters: service, search" }, 400);
  }

  let rkey: string;
  try {
    const parsed = new AtUri(serviceUri);
    rkey = parsed.rkey;
  } catch {
    return c.json({ error: "invalid service AT URI" }, 400);
  }

  const handler = mentionServices[rkey];
  if (!handler) {
    return c.json({ error: `unknown service: ${rkey}` }, 404);
  }

  const results = await handler(search, limit);
  return c.json({ results });
});

//Cursor format ts::uri

// Everything the skeleton response needs from a document. postRef is the
// pub.leaflet field, bskyPostRef the site.standard one; publishedAt gates
// pub.leaflet records the same way normalizeDocument does.
const SKELETON_COLUMNS = `uri, sort_date, postRef:data->postRef, bskyPostRef:data->bskyPostRef, publishedAt:data->>publishedAt`;

type SkeletonRow = {
  uri: string;
  sort_date: string | null;
  postRef: unknown;
  bskyPostRef: unknown;
  publishedAt: unknown;
};

function skeletonResponse(posts: SkeletonRow[], cursor: string | undefined) {
  let lastPost = posts[posts.length - 1];
  let newCursor = lastPost ? `${lastPost.sort_date}::${lastPost.uri}` : null;
  return {
    cursor: newCursor || cursor,
    feed: posts.flatMap((p) => {
      let ref = (p.bskyPostRef ?? (p.publishedAt ? p.postRef : null)) as {
        uri?: string;
      } | null;
      if (!ref?.uri) return [];
      return { post: ref.uri };
    }),
  };
}

app.get("/xrpc/app.bsky.feed.getFeedSkeleton", async (c) => {
  let feed = c.req.query("feed");
  if (!feed) return c.json({ feed: [] });
  let cursor = c.req.query("cursor");
  let parsedCursor;
  if (cursor) {
    let date = cursor.split("::")[0];
    let uri = cursor.split("::")[1];
    parsedCursor = { date, uri };
  }
  let limit = parseInt(c.req.query("limit") || "10");
  let feedAtURI = new AtUri(feed);
  // The quotes feed isn't personalized, so serve it without auth — the bsky
  // appview omits the viewer JWT for logged-out requests, feed previews, and
  // crawlers, and those should still see the feed.
  if (feedAtURI.rkey == "bsky-leaflet-quotes") {
    let query = supabaseServerClient
      .from("document_mentions_in_bsky")
      .select("uri, indexed_at")
      .order("indexed_at", { ascending: false })
      .order("uri", { ascending: false })
      .limit(25);
    if (parsedCursor)
      query = query.or(
        `indexed_at.lt.${parsedCursor.date},and(indexed_at.eq.${parsedCursor.date},uri.lt.${parsedCursor.uri})`,
      );

    let { data, error } = await query;
    if (error) console.error("bsky-leaflet-quotes skeleton query error:", error);
    let posts = data || [];

    let lastPost = posts[posts.length - 1];
    let newCursor = lastPost ? `${lastPost.indexed_at}::${lastPost.uri}` : null;
    return c.json({
      cursor: newCursor || cursor,
      feed: posts.flatMap((p) => {
        return { post: p.uri };
      }),
    });
  }
  let auth = await validateAuth(c.req, serviceDid);
  if (!auth) return c.json({ feed: [] });
  if (feedAtURI.rkey === "all-leaflets") {
    let query = supabaseServerClient
      .from("documents")
      .select(
        `${SKELETON_COLUMNS},
          documents_in_publications(publications(uri))`,
      )
      .or(
        "record->preferences->showInDiscover.is.null,record->preferences->>showInDiscover.eq.true",
        { referencedTable: "documents_in_publications.publications" },
      )
      .eq("indexed", true)
      .or("data->postRef.not.is.null,data->bskyPostRef.not.is.null")
      .order("sort_date", { ascending: false })
      .order("uri", { ascending: false })
      .limit(25);
    if (parsedCursor)
      query = query.or(
        `sort_date.lt.${parsedCursor.date},and(sort_date.eq.${parsedCursor.date},uri.lt.${parsedCursor.uri})`,
      );

    let { data, error } = await query;
    if (error) console.error("all-leaflets skeleton query error:", error);
    return c.json(skeletonResponse(data || [], cursor));
  }

  let isFollowsFeed = feedAtURI.rkey === "bsky-follows-leaflets";
  if (isFollowsFeed && !cursor) {
    console.log("Sending event");
    await inngest.send({ name: "feeds/index-follows", data: { did: auth } });
  }
  // Anything else is the default subscription feed.
  let { data, error } = await supabaseServerClient.rpc(
    isFollowsFeed
      ? "get_follows_feed_skeleton"
      : "get_subscription_feed_skeleton",
    {
      p_identity: auth,
      p_cursor_timestamp: parsedCursor?.date,
      p_cursor_uri: parsedCursor?.uri,
      p_limit: 25,
    },
  );
  if (error) console.error("personalized skeleton rpc error:", error);
  return c.json(
    skeletonResponse(
      (data || []).map((d) => ({
        uri: d.uri,
        sort_date: d.sort_date,
        postRef: d.post_ref,
        bskyPostRef: d.bsky_post_ref,
        publishedAt: d.published_at,
      })),
      cursor,
    ),
  );
});

const didResolver = new DidResolver({ didCache: new MemoryCache() });
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
  // verifyJwt throws on a bad/expired token; treat that as unauthenticated
  // rather than letting the whole skeleton request 500.
  try {
    const parsed = await verifyJwt(
      jwt,
      serviceDid,
      nsid,
      async (did: string) => {
        return didResolver.resolveAtprotoKey(did);
      },
    );
    return parsed.iss;
  } catch (err) {
    console.error("feed skeleton auth failed:", err);
    return null;
  }
};

serve({ fetch: app.fetch, port: 3030 });
