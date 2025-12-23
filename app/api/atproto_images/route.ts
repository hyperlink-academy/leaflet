import { IdResolver } from "@atproto/identity";
import { NextRequest, NextResponse } from "next/server";

let idResolver = new IdResolver();

/**
 * Fetches a blob from an AT Protocol PDS given a DID and CID
 * Returns the Response object or null if the blob couldn't be fetched
 */
export async function fetchAtprotoBlob(
  did: string,
  cid: string,
): Promise<Response | null> {
  if (!did || !cid) return null;

  let identity = await idResolver.did.resolve(did);
  let service = identity?.service?.find((f) => f.id === "#atproto_pds");
  if (!service) return null;

  const response = await fetch(
    `${service.serviceEndpoint}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`,
    {
      headers: {
        "Accept-Encoding": "gzip, deflate, br, zstd",
      },
    },
  );

  if (!response.ok) return null;

  return response;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = {
    did: url.searchParams.get("did") ?? "",
    cid: url.searchParams.get("cid") ?? "",
  };

  const response = await fetchAtprotoBlob(params.did, params.cid);
  if (!response) return new NextResponse(null, { status: 404 });

  // Clone the response to modify headers
  const cachedResponse = new Response(response.body, response);

  // Set cache-control header to cache indefinitely
  cachedResponse.headers.set(
    "Cache-Control",
    "public, max-age=31536000, immutable, s-maxage=86400, stale-while-revalidate=604800",
  );
  cachedResponse.headers.set(
    "CDN-Cache-Control",
    "s-maxage=86400, stale-while-revalidate=86400",
  );

  return cachedResponse;
}
