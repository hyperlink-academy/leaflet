import { IdResolver } from "@atproto/identity";
import { NextRequest, NextResponse } from "next/server";
let idResolver = new IdResolver();

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = {
    did: url.searchParams.get("did") ?? "",
    cid: url.searchParams.get("cid") ?? "",
  };
  console.log(params);
  if (!params.did || !params.cid)
    return new NextResponse(null, { status: 404 });

  let identity = await idResolver.did.resolve(params.did);
  let service = identity?.service?.find((f) => f.id === "#atproto_pds");
  console.log(identity);
  if (!service) return new NextResponse(null, { status: 404 });
  return fetch(
    `${service.serviceEndpoint}/xrpc/com.atproto.sync.getBlob?did=${params.did}&cid=${params.cid}`,
  );
}
