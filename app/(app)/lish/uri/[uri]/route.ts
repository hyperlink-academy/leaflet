import { NextRequest, NextResponse } from "next/server";
import { AtUri } from "@atproto/api";
import { supabaseServerClient } from "supabase/serverClient";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";
import { getDocumentURL } from "app/(app)/lish/createPub/getPublicationURL";
import {
  isDocumentCollection,
  isPublicationCollection,
} from "src/utils/collectionHelpers";

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

    if (isPublicationCollection(uri.collection)) {
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
    } else if (isDocumentCollection(uri.collection)) {
      // Document link - need to find the publication it belongs to
      const { data: docInPub } = await supabaseServerClient
        .from("documents_in_publications")
        .select("publication, documents!inner(data), publications!inner(record)")
        .eq("document", atUriString)
        .single();

      if (docInPub?.publication && docInPub.publications) {
        const normalizedPub = normalizePublicationRecord(
          docInPub.publications.record,
        );

        if (!normalizedPub?.url) {
          return new NextResponse("Publication has no url", {
            status: 404,
          });
        }

        // Redirect to the document on the publication's domain, honoring the
        // record's path property, which can differ from the rkey (temporary
        // redirect since url and path can change)
        const normalizedDoc = normalizeDocumentRecord(
          docInPub.documents.data,
          atUriString,
        );
        const target = normalizedDoc
          ? getDocumentURL(normalizedDoc, atUriString, normalizedPub)
          : `${normalizedPub.url.replace(/\/+$/, "")}/${uri.rkey}`;
        return NextResponse.redirect(target, 307);
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
