import { NextResponse } from "next/server";
import { DidResolver } from "@atproto/identity";
import { parseReqNsid, verifyJwt } from "@atproto/xrpc-server";
import { supabaseServerClient } from "supabase/serverClient";

const serviceDid = "did:web:leaflet.pub:lish:feeds";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  let { path } = await params;
  if (path[0] === "did.json")
    return NextResponse.json({
      "@context": ["https://www.w3.org/ns/did/v1"],
      id: serviceDid,
      service: [
        {
          id: "#bsky_fg",
          type: "BskyFeedGenerator",
          serviceEndpoint: `https://leaflet.pub/lish/feeds`,
        },
      ],
    });
  let auth = validateAuth(req, serviceDid);
  if (!auth) return NextResponse.json({}, { status: 301 });
  // The skeleton only needs the bsky post ref out of each document, so
  // project just the refs instead of the full record jsonb. postRef is the
  // pub.leaflet field, bskyPostRef the site.standard one; publishedAt gates
  // pub.leaflet records the same way normalizeDocument does.
  let { data: publications } = await supabaseServerClient
    .from("publication_subscriptions")
    .select(
      `publications(documents_in_publications(documents(
         postRef:data->postRef, bskyPostRef:data->bskyPostRef, publishedAt:data->>publishedAt)))`,
    )
    .eq("identity", auth);
  return NextResponse.json({
    feed: [
      ...(publications || []).flatMap((pub) => {
        let posts = pub.publications?.documents_in_publications || [];
        return posts.flatMap((p) => {
          if (!p.documents) return [];
          let ref = (p.documents.bskyPostRef ??
            (p.documents.publishedAt ? p.documents.postRef : null)) as {
            uri?: string;
          } | null;
          if (!ref?.uri) return [];
          return { post: ref.uri };
        });
      }),
    ],
  });
}

const didResolver = new DidResolver({});
const validateAuth = async (
  req: Request,
  serviceDid: string,
): Promise<string | null> => {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  const jwt = authorization.replace("Bearer ", "").trim();
  const nsid = parseReqNsid(req);
  const parsed = await verifyJwt(jwt, serviceDid, nsid, async (did: string) => {
    return didResolver.resolveAtprotoKey(did);
  });
  return parsed.iss;
};
