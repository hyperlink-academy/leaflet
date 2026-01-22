import { AtUri } from "@atproto/syntax";
import { IdResolver } from "@atproto/identity";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerClient } from "supabase/serverClient";
import {
  normalizePublicationRecord,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";
import {
  isDocumentCollection,
  isPublicationCollection,
} from "src/utils/collectionHelpers";
import { publicationUriFilter } from "src/utils/uriHelpers";
import sharp from "sharp";

const idResolver = new IdResolver();

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const bgColor = searchParams.get("bg") || "#0000E1";
  const fgColor = searchParams.get("fg") || "#FFFFFF";

  try {
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

    let normalizedPub: NormalizedPublication | null = null;
    let publicationUri: string;

    // Check if it's a document or publication
    if (isDocumentCollection(uri.collection)) {
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
      normalizedPub = normalizePublicationRecord(docInPub.publications.record);
    } else if (isPublicationCollection(uri.collection)) {
      // Query the publications table directly
      const { data: publications } = await supabaseServerClient
        .from("publications")
        .select("record, uri")
        .or(publicationUriFilter(uri.host, uri.rkey))
        .order("uri", { ascending: false })
        .limit(1);
      const publication = publications?.[0];

      if (!publication || !publication.record) {
        return new NextResponse(null, { status: 404 });
      }

      publicationUri = publication.uri;
      normalizedPub = normalizePublicationRecord(publication.record);
    } else {
      // Not a supported collection
      return new NextResponse(null, { status: 404 });
    }

    // Check if the publication has an icon
    if (!normalizedPub?.icon) {
      // Generate a placeholder with the first letter of the publication name
      const firstLetter = (normalizedPub?.name || "?")
        .slice(0, 1)
        .toUpperCase();

      // Create a simple SVG placeholder with theme colors
      const svg = `<svg width="96" height="96" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" rx="48" ry="48" fill="${bgColor}"/>
  <text x="50%" y="50%" font-size="64" font-weight="bold" font-family="Arial, Helvetica, sans-serif" fill="${fgColor}" text-anchor="middle" dominant-baseline="central">${firstLetter}</text>
</svg>`;

      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control":
            "public, max-age=3600, s-maxage=3600, stale-while-revalidate=2592000",
          "CDN-Cache-Control": "s-maxage=3600, stale-while-revalidate=2592000",
        },
      });
    }

    // Parse the publication URI to get the DID
    const pubUri = new AtUri(publicationUri);

    // Get the CID from the icon blob
    const cid = (normalizedPub.icon.ref as unknown as { $link: string })[
      "$link"
    ];

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
