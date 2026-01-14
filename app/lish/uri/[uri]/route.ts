import { NextRequest, NextResponse } from "next/server";
import { AtUri } from "@atproto/api";
import { supabaseServerClient } from "supabase/serverClient";
import {
  normalizePublicationRecord,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";

/**
 * Redirect route for AT URIs (publications and documents)
 * Redirects to the actual hosted domains from publication records
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uri: string }> },
) {
  try {
    const { uri: uriParam } = await params;
    const atUriString = decodeURIComponent(uriParam);
    const uri = new AtUri(atUriString);

    if (uri.collection === "pub.leaflet.publication") {
      // Get the publication record to retrieve base_path
      const { data: publication } = await supabaseServerClient
        .from("publications")
        .select("record")
        .eq("uri", atUriString)
        .single();

      if (!publication?.record) {
        return new NextResponse("Publication not found", { status: 404 });
      }

      const normalizedPub = normalizePublicationRecord(publication.record);
      if (!normalizedPub?.url) {
        return new NextResponse("Publication has no url", {
          status: 404,
        });
      }

      // Redirect to the publication's hosted domain (temporary redirect since url can change)
      return NextResponse.redirect(normalizedPub.url, 307);
    } else if (uri.collection === "pub.leaflet.document") {
      // Document link - need to find the publication it belongs to
      const { data: docInPub } = await supabaseServerClient
        .from("documents_in_publications")
        .select("publication, publications!inner(record)")
        .eq("document", atUriString)
        .single();

      if (docInPub?.publication && docInPub.publications) {
        // Document is in a publication - redirect to domain/rkey
        const normalizedPub = normalizePublicationRecord(
          docInPub.publications.record,
        );

        if (!normalizedPub?.url) {
          return new NextResponse("Publication has no url", {
            status: 404,
          });
        }

        // Ensure url ends without trailing slash
        const cleanUrl = normalizedPub.url.endsWith("/")
          ? normalizedPub.url.slice(0, -1)
          : normalizedPub.url;

        // Redirect to the document on the publication's domain (temporary redirect since url can change)
        return NextResponse.redirect(`${cleanUrl}/${uri.rkey}`, 307);
      }

      // If not in a publication, check if it's a standalone document
      const { data: doc } = await supabaseServerClient
        .from("documents")
        .select("uri")
        .eq("uri", atUriString)
        .single();

      if (doc) {
        // Standalone document - redirect to /p/did/rkey (temporary redirect)
        return NextResponse.redirect(
          new URL(`/p/${uri.host}/${uri.rkey}`, request.url),
          307,
        );
      }

      // Document not found
      return new NextResponse("Document not found", { status: 404 });
    }

    // Unsupported collection type
    return new NextResponse("Unsupported URI type", { status: 400 });
  } catch (error) {
    console.error("Error resolving AT URI:", error);
    return new NextResponse("Invalid URI", { status: 400 });
  }
}
