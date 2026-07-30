import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";
import { cache } from "react";
import { idResolver } from "src/identity";
import { notFound } from "next/navigation";
import { DocumentPageRenderer } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/DocumentPageRenderer";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import { documentUriFilter } from "src/utils/uriHelpers";
import { getDocumentURL } from "src/utils/getPublicationURL";
import { decodeQuotePosition } from "src/utils/quotePosition";

// On-demand ISR: rendered on first request, then served from the CDN and
// re-rendered in the background. The empty generateStaticParams is what opts a
// dynamic-params route into caching at all — `revalidate` alone leaves it
// fully dynamic. Writes invalidate eagerly via revalidatePublicationPaths.
export const revalidate = 300;
export async function generateStaticParams() {
  return [];
}

// Memoized per request so the metadata and the page body resolve the handle
// once. Failures stay failures — the memoized rejection re-throws, and each
// caller treats an unresolvable handle as a 404.
const resolveHandle = cache((handle: string) =>
  idResolver.handle.resolve(handle),
);

export async function generateMetadata(props: {
  params: Promise<{ didOrHandle: string; rkey: string }>;
}): Promise<Metadata> {
  let params = await props.params;
  let didOrHandle = decodeURIComponent(params.didOrHandle);

  // Resolve handle to DID if necessary
  let did = didOrHandle;
  if (!didOrHandle.startsWith("did:")) {
    try {
      let resolved = await resolveHandle(didOrHandle);
      if (resolved) did = resolved;
    } catch (e) {
      return { title: "404" };
    }
  }

  let { data: documents } = await supabaseServerClient
    .from("documents")
    .select("*")
    .or(documentUriFilter(did, params.rkey))
    .order("uri", { ascending: false })
    .limit(1);
  let document = documents?.[0];

  if (!document) return { title: "404" };

  const docRecord = normalizeDocumentRecord(document.data);
  if (!docRecord) return { title: "404" };

  // Canonical URL points at the document's blog domain (doc.site + path) so
  // the post on leaflet.pub (and its quote pages, which inherit this
  // metadata) doesn't compete with the custom-domain version in search.
  let docUrl = getDocumentURL(docRecord, document.uri);
  let canonical = docUrl.startsWith("http") ? docUrl : undefined;

  return {
    alternates: canonical ? { canonical } : undefined,
    icons: {
      other: [
        {
          rel: "alternate",
          url: document.uri,
        },
        { rel: "site.standard.document", url: document.uri },
      ],
    },
    title: docRecord.title,
    description: docRecord?.description || "",
    other: {
      "at:canonical": document.uri,
    },
  };
}

export default async function StandaloneDocumentPage(props: {
  params: Promise<{ didOrHandle: string; rkey: string; quote?: string }>;
}) {
  let params = await props.params;
  let didOrHandle = decodeURIComponent(params.didOrHandle);

  // Resolve handle to DID if necessary
  let did = didOrHandle;
  if (!didOrHandle.startsWith("did:")) {
    let resolved = await resolveHandle(didOrHandle).catch(() => null);
    if (!resolved) notFound();
    did = resolved;
  }

  return (
    <DocumentPageRenderer
      did={did}
      rkey={params.rkey}
      openPageId={
        params.quote ? decodeQuotePosition(params.quote)?.pageId : undefined
      }
    />
  );
}
