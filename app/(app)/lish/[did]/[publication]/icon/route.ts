import { NextRequest, NextResponse } from "next/server";
import { supabaseServerClient } from "supabase/serverClient";
import sharp from "sharp";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import {
  ensureDerivedImageCached,
  fetchAtprotoBlob,
} from "src/utils/atprotoImages";

export const dynamic = "force-dynamic";

// Favicon variants are keyed by CID, so they're immutable; the redirect
// response itself stays short-lived since the record's icon can change.
const ICON_PREFIX = "pub-icon/w32";
const CACHE_HEADERS = {
  "CDN-Cache-Control": "s-maxage=86400, stale-while-revalidate=86400",
  "Cache-Control":
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
};

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

    let resized: Uint8Array | null = null;
    const url = await ensureDerivedImageCached(
      `${ICON_PREFIX}/${cid}`,
      async () => {
        const response = await fetchAtprotoBlob(did, cid);
        if (!response) return null;
        resized = new Uint8Array(
          await sharp(await response.arrayBuffer())
            .resize({ width: 32, height: 32 })
            .png()
            .toBuffer(),
        );
        return { bytes: resized, contentType: "image/png" };
      },
    );
    if (url)
      return new NextResponse(null, {
        status: 302,
        headers: { Location: url, ...CACHE_HEADERS },
      });
    if (!resized)
      return NextResponse.redirect(new URL("/icon.png", request.url));

    // Fall back to streaming the resized bytes if storage failed.
    return new Response(resized, {
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
