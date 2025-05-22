import { IdResolver } from "@atproto/identity";
import { NextRequest, NextResponse } from "next/server";
let idResolver = new IdResolver();

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ did: string; cid?: string }> },
) {
  let params = await props.params;
  let identity = await idResolver.did.resolve(params.did);
  let service = identity?.service?.find((f) => f.type === "atproto_pds");
  if (!service) return new NextResponse(null, { status: 404 });
  return fetch(
    `${service.serviceEndpoint}/xrpc/com.atproto.sync.getBlob?did=${params.did}&cid=${params.cid}`,
  );
}
