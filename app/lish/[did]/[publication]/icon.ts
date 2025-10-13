import { NextRequest } from "next/server";
import { IdResolver } from "@atproto/identity";
import { AtUri } from "@atproto/syntax";
import { PubLeafletPublication } from "lexicons/api";
import { supabaseServerClient } from "supabase/serverClient";
import sharp from "sharp";
import { redirect } from "next/navigation";

let idResolver = new IdResolver();

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";
export default async function Icon({
  params,
}: {
  params: { did: string; publication: string };
}) {
  try {
    let did = decodeURIComponent(params.did);
    let uri;
    if (/^(?!\.$|\.\.S)[A-Za-z0-9._:~-]{1,512}$/.test(params.publication)) {
      uri = AtUri.make(
        did,
        "pub.leaflet.publication",
        params.publication,
      ).toString();
    }
    let { data: publication } = await supabaseServerClient
      .from("publications")
      .select(
        `*,
          publication_subscriptions(*),
        documents_in_publications(documents(*))
        `,
      )
      .eq("identity_did", did)
      .or(`name.eq."${params.publication}", uri.eq."${uri}"`)
      .single();

    let record = publication?.record as PubLeafletPublication.Record | null;
    if (!record?.icon) return redirect("/icon.png");

    let identity = await idResolver.did.resolve(did);
    let service = identity?.service?.find((f) => f.id === "#atproto_pds");
    if (!service) return null;
    let cid = (record.icon.ref as unknown as { $link: string })["$link"];
    const response = await fetch(
      `${service.serviceEndpoint}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`,
    );
    let blob = await response.blob();
    let resizedImage = await sharp(await blob.arrayBuffer())
      .resize({ width: 32, height: 32 })
      .toBuffer();
    return new Response(new Uint8Array(resizedImage), {
      headers: {
        "Content-Type": "image/png",
        "CDN-Cache-Control": "s-maxage=86400, stale-while-revalidate=86400",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return redirect("/icon.png");
  }
}
