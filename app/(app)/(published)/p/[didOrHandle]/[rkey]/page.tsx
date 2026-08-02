import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { resolveDid } from "../resolveDid";
import { DocumentPageRenderer } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/DocumentPageRenderer";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import { documentUriFilter } from "src/utils/uriHelpers";
import { getDocumentURL } from "src/utils/getPublicationURL";

// On-demand ISR: rendered on first request, then served from the CDN and
// re-rendered in the background. The empty generateStaticParams is what opts a
// dynamic-params route into caching at all — `revalidate` alone leaves it
// fully dynamic. Writes invalidate eagerly — Leaflet's own actions in-process,
// firehose-indexed writes via /api/appview_revalidate — so the timer only
// backstops what nothing revalidates (Bluesky profiles, like/mention counts).
export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata(props: {
  params: Promise<{ didOrHandle: string; rkey: string }>;
}): Promise<Metadata> {
  let params = await props.params;
  let did = await resolveDid(decodeURIComponent(params.didOrHandle));
  if (!did) return { title: "404" };

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
  params: Promise<{ didOrHandle: string; rkey: string }>;
}) {
  let params = await props.params;
  let didOrHandle = decodeURIComponent(params.didOrHandle);
  let did = await resolveDid(didOrHandle);
  if (!did) notFound();
  // Canonicalize handle URLs onto the DID form so a document has one cache
  // entry here instead of one per handle spelling — publishing revalidates
  // the DID path, and a stale handle entry would outlive the update.
  if (didOrHandle !== did)
    redirect(`/p/${encodeURIComponent(did)}/${params.rkey}`);

  return <DocumentPageRenderer did={did} rkey={params.rkey} />;
}
