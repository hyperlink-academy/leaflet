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
  if (feedAtURI.rkey === "bsky-follows-leaflets") {
    if (!cursor) {
      console.log("Sending event");
      await inngest.send({ name: "feeds/index-follows", data: { did: auth } });
    }
    // plan-checked: KNOWN DEBT — the follow filter lives in !inner embeds, so
    // the newest-first limit walks documents_sort_date_idx probing the embeds
    // per document, scanning the whole table for users whose follows have few
    // or old posts. Needs a fenced SQL function like get_reader_feed.
    query = supabaseServerClient
      .from("documents")
      // The skeleton only needs the bsky post ref out of each document, so
      // project just the refs instead of the full record jsonb; the embedded
      // tables exist purely to filter and select as little as possible.
      .select(
        `${SKELETON_COLUMNS},
         documents_in_publications!inner(
           publications!inner(uri,
             identities!publications_identity_did_fkey!inner(
               bsky_follows!bsky_follows_follows_fkey!inner(identity)
              )
            )
          )`,
      )
      .eq(
        "documents_in_publications.publications.identities.bsky_follows.identity",
        auth,
      );
  } else if (feedAtURI.rkey === "all-leaflets") {
    query = supabaseServerClient
      .from("documents")
      .select(
        `${SKELETON_COLUMNS},
          documents_in_publications(publications(uri))`,
      )
      .or(
        "record->preferences->showInDiscover.is.null,record->preferences->>showInDiscover.eq.true",
        { referencedTable: "documents_in_publications.publications" },
      );
  } else {
    //the default subscription feed
    // plan-checked: KNOWN DEBT — same shape as bsky-follows-leaflets above:
    // subscribers with few or quiet subscriptions scan the whole documents
    // table. get_reader_feed already fences this exact join for the reader
    // UI; this skeleton needs the same treatment.
    query = supabaseServerClient
      .from("documents")
      .select(
        `${SKELETON_COLUMNS},
          documents_in_publications!inner(publications!inner(uri, publication_subscriptions!inner(identity)))`,
      )
      .eq(
        "documents_in_publications.publications.publication_subscriptions.identity",
        auth,
      );
  }
  query = query
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
  console.log(error);
  posts = data;

  posts = posts || [];

  let lastPost = posts[posts.length - 1];
  let newCursor = lastPost ? `${lastPost.sort_date}::${lastPost.uri}` : null;
  return c.json({
    cursor: newCursor || cursor,
    feed: posts.flatMap((p) => {
      let ref = (p.bskyPostRef ?? (p.publishedAt ? p.postRef : null)) as {
        uri?: string;
      } | null;
      if (!ref?.uri) return [];
      return { post: ref.uri };
    }),
  });
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
  const parsed = await verifyJwt(jwt, serviceDid, nsid, async (did: string) => {
    return didResolver.resolveAtprotoKey(did);
  });
  return parsed.iss;
};

serve({ fetch: app.fetch, port: 3030 });
