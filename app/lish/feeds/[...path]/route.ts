import { NextResponse } from "next/server";
import { DidResolver } from "@atproto/identity";
import { parseReqNsid, verifyJwt } from "@atproto/xrpc-server";
import { supabaseServerClient } from "supabase/serverClient";
import {
  normalizeDocumentRecord,
  type NormalizedDocument,
} from "src/utils/normalizeRecords";

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
  let { data: publications } = await supabaseServerClient
    .from("publication_subscriptions")
    .select(`publications(documents_in_publications(documents(*)))`)
    .eq("identity", auth);
  return NextResponse.json({
    feed: [
      ...(publications || []).flatMap((pub) => {
        let posts = pub.publications?.documents_in_publications || [];
        return posts.flatMap((p) => {
          if (!p.documents?.data) return [];
          const normalizedDoc = normalizeDocumentRecord(p.documents.data, p.documents.uri);
          if (!normalizedDoc?.bskyPostRef) return [];
          return { post: normalizedDoc.bskyPostRef.uri };
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
