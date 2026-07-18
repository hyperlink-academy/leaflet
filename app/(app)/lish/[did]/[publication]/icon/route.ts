import { NextRequest, NextResponse } from "next/server";
import { supabaseServerClient } from "supabase/serverClient";
import sharp from "sharp";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import { fetchAtprotoBlob } from "app/api/atproto_images/route";

export const dynamic = "force-dynamic";

// Favicon variants are keyed by CID, so they're immutable; the redirect
// response itself stays short-lived since the record's icon can change.
const ICON_BUCKET = "url-previews";
const ICON_PREFIX = "pub-icon/w32";
const CACHE_HEADERS = {
  "CDN-Cache-Control": "s-maxage=86400, stale-while-revalidate=86400",
  "Cache-Control":
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
};

function variantUrl(cid: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_API_URL}/storage/v1/object/public/${ICON_BUCKET}/${ICON_PREFIX}/${cid}`;
}

// Bytes are served off Supabase's CDN rather than streamed through this
// function: bytes leaving Vercel bill at fast data transfer rates while
// Supabase serves the same bytes as cheap cached egress.
function redirect(to: string) {
  return new NextResponse(null, {
    status: 302,
    headers: { Location: to, ...CACHE_HEADERS },
  });
}

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
    if (!record?.icon)
      return NextResponse.redirect(new URL("/icon.png", request.url));

    let cid = (record.icon.ref as unknown as { $link: string })["$link"];

    // Already resized and stored for this CID?
    const existing = await fetch(variantUrl(cid), { method: "HEAD" });
    if (existing.ok) return redirect(variantUrl(cid));

    const response = await fetchAtprotoBlob(did, cid);
    if (!response)
      return NextResponse.redirect(new URL("/icon.png", request.url));
    let resizedImage = await sharp(await response.arrayBuffer())
      .resize({ width: 32, height: 32 })
      .png()
      .toBuffer();

    const { error } = await supabaseServerClient.storage
      .from(ICON_BUCKET)
      .upload(`${ICON_PREFIX}/${cid}`, new Uint8Array(resizedImage), {
        contentType: "image/png",
        // storage-js expects seconds, not a header value.
        cacheControl: "31536000",
        upsert: true,
      });
    if (!error) return redirect(variantUrl(cid));
    console.log("failed to store favicon variant", cid, error);

    // Fall back to streaming the resized bytes if storage failed.
    return new Response(new Uint8Array(resizedImage), {
      headers: {
        "Content-Type": "image/png",
        ...CACHE_HEADERS,
      },
    });
  } catch (e) {
    console.log(e);
    return NextResponse.redirect(new URL("/icon.png", request.url));
  }
}
