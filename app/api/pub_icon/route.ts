import { AtUri } from "@atproto/syntax";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerClient } from "supabase/serverClient";
import {
  ensureDerivedImageCached,
  fetchAtprotoBlob,
} from "src/utils/atprotoImages";
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

export const runtime = "nodejs";

// Variants are keyed by CID, so they're immutable; the redirect response
// itself stays short-lived since the publication record's icon can change.
const ICON_PREFIX = "pub-icon/w96";
const CACHE_HEADERS = {
  "Cache-Control":
    "public, max-age=3600, s-maxage=3600, stale-while-revalidate=2592000",
  "CDN-Cache-Control": "s-maxage=3600, stale-while-revalidate=2592000",
};

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const bgColor = searchParams.get("bg") || "#57822B";
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
          ...CACHE_HEADERS,
        },
      });
    }

    // Parse the publication URI to get the DID
    const pubUri = new AtUri(publicationUri);

    // Get the CID from the icon blob
    const cid = (normalizedPub.icon.ref as unknown as { $link: string })[
      "$link"
    ];

    let resized: Uint8Array | null = null;
    const url = await ensureDerivedImageCached(
      `${ICON_PREFIX}/${cid}`,
      async () => {
        const blobResponse = await fetchAtprotoBlob(pubUri.host, cid);
        if (!blobResponse) return null;
        // Resize to 96x96 using Sharp
        resized = new Uint8Array(
          await sharp(Buffer.from(await blobResponse.arrayBuffer()))
            .resize(96, 96, {
              fit: "cover",
              position: "center",
            })
            .webp({ quality: 90 })
            .toBuffer(),
        );
        return { bytes: resized, contentType: "image/webp" };
      },
    );
    if (url)
      return new NextResponse(null, {
        status: 302,
        headers: { Location: url, ...CACHE_HEADERS },
      });
    if (!resized) return new NextResponse(null, { status: 404 });

    // Fall back to streaming the resized bytes if storage failed.
    return new NextResponse(resized, {
      headers: {
        "Content-Type": "image/webp",
        ...CACHE_HEADERS,
      },
    });
  } catch (error) {
    console.error("Error fetching publication icon:", error);
    return new NextResponse(null, { status: 500 });
  }
}
