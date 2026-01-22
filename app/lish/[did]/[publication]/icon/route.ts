import { NextRequest } from "next/server";
import { IdResolver } from "@atproto/identity";
import { supabaseServerClient } from "supabase/serverClient";
import sharp from "sharp";
import { redirect } from "next/navigation";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";

let idResolver = new IdResolver();

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ did: string; publication: string }> },
) {
  const params = await props.params;
  try {
    let did = decodeURIComponent(params.did);
    let publication_name = decodeURIComponent(params.publication);
    let { data: publications } = await supabaseServerClient
      .from("publications")
      .select(
        `*,
          publication_subscriptions(*),
        documents_in_publications(documents(*))
        `,
      )
      .eq("identity_did", did)
      .or(publicationNameOrUriFilter(did, publication_name))
      .order("uri", { ascending: false })
      .limit(1);
    let publication = publications?.[0];

    const record = normalizePublicationRecord(publication?.record);
    if (!record?.icon) return redirect("/icon.png");

    let identity = await idResolver.did.resolve(did);
    let service = identity?.service?.find((f) => f.id === "#atproto_pds");
    if (!service) return redirect("/icon.png");
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
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    console.log(e);
    return redirect("/icon.png");
  }
}
