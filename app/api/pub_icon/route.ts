import { AtUri } from "@atproto/syntax";
import { IdResolver } from "@atproto/identity";
import { NextRequest, NextResponse } from "next/server";
import { PubLeafletPublication } from "lexicons/api";
import { supabaseServerClient } from "supabase/serverClient";
import sharp from "sharp";

const idResolver = new IdResolver();

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const at_uri = searchParams.get("at_uri");

    if (!at_uri) {
      return new NextResponse(null, { status: 400 });
    }

    // Parse the AT URI
    let uri: AtUri;
    try {
      uri = new AtUri(at_uri);
    } catch (e) {
      return new NextResponse(null, { status: 400 });
    }

    let publicationRecord: PubLeafletPublication.Record | null = null;
    let publicationUri: string;

    // Check if it's a document or publication
    if (uri.collection === "pub.leaflet.document") {
      // Query the documents_in_publications table to get the publication
      const { data: docInPub } = await supabaseServerClient
        .from("documents_in_publications")
        .select("publication, publications(record)")
        .eq("document", at_uri)
        .single();

      if (!docInPub || !docInPub.publications) {
        return new NextResponse(null, { status: 404 });
      }

      publicationUri = docInPub.publication;
      publicationRecord = docInPub.publications.record as PubLeafletPublication.Record;
    } else if (uri.collection === "pub.leaflet.publication") {
      // Query the publications table directly
      const { data: publication } = await supabaseServerClient
        .from("publications")
        .select("record, uri")
        .eq("uri", at_uri)
        .single();

      if (!publication || !publication.record) {
        return new NextResponse(null, { status: 404 });
      }

      publicationUri = publication.uri;
      publicationRecord = publication.record as PubLeafletPublication.Record;
    } else {
      // Not a supported collection
      return new NextResponse(null, { status: 404 });
    }

    // Check if the publication has an icon
    if (!publicationRecord?.icon) {
      return new NextResponse(null, { status: 404 });
    }

    // Parse the publication URI to get the DID
    const pubUri = new AtUri(publicationUri);

    // Get the CID from the icon blob
    const cid = (publicationRecord.icon.ref as unknown as { $link: string })["$link"];

    // Fetch the blob from the PDS
    const identity = await idResolver.did.resolve(pubUri.host);
    const service = identity?.service?.find((f) => f.id === "#atproto_pds");
    if (!service) return new NextResponse(null, { status: 404 });

    const blobResponse = await fetch(
      `${service.serviceEndpoint}/xrpc/com.atproto.sync.getBlob?did=${pubUri.host}&cid=${cid}`,
      {
        headers: {
          "Accept-Encoding": "gzip, deflate, br, zstd",
        },
      },
    );

    if (!blobResponse.ok) {
      return new NextResponse(null, { status: 404 });
    }

    // Get the image buffer
    const imageBuffer = await blobResponse.arrayBuffer();

    // Resize to 96x96 using Sharp
    const resizedImage = await sharp(Buffer.from(imageBuffer))
      .resize(96, 96, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 90 })
      .toBuffer();

    // Return with caching headers
    return new NextResponse(resizedImage, {
      headers: {
        "Content-Type": "image/webp",
        // Cache for 1 hour, but serve stale for much longer while revalidating
        "Cache-Control":
          "public, max-age=3600, s-maxage=3600, stale-while-revalidate=2592000",
        "CDN-Cache-Control": "s-maxage=3600, stale-while-revalidate=2592000",
      },
    });
  } catch (error) {
    console.error("Error fetching publication icon:", error);
    return new NextResponse(null, { status: 500 });
  }
}
