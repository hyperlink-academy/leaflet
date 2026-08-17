import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { resolveDid } from "../resolveDid";
import { DocumentPageRenderer } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/DocumentPageRenderer";
import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
import { documentUriFilter } from "src/utils/uriHelpers";
import { getDocumentURL } from "src/utils/getPublicationURL";
import { documentDescription } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/postPageMetadata";

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
    .select("*, documents_in_publications(publications(*))")
    .or(documentUriFilter(did, params.rkey))
    .order("uri", { ascending: false })
    // A document can legally join two publications, and the [0] pick below
    // decides the canonical URL; without an embed order it varies between
    // renders and the page would advertise a different canonical each time
    // ISR regenerates. Same ordering as getPostPageData so both agree.
    .order("publication", { referencedTable: "documents_in_publications" })
    .limit(1);
  let document = documents?.[0];

  if (!document) return { title: "404" };

  const docRecord = normalizeDocumentRecord(document.data);
  if (!docRecord) return { title: "404" };

  // Canonical URL points at the document's home — the publication's blog
  // domain for publication posts (doc.site alone is an AT-URI for those),
  // doc.site for standalone docs — so this leaflet.pub copy (and its quote
  // pages, which inherit this metadata) doesn't compete with it in search.
  // Self-referential when the document resolves nowhere else, so the page is
  // never canonical-less.
  let publication = document.documents_in_publications[0]?.publications;
  let docUrl = getDocumentURL(docRecord, document.uri, publication);
  if (docUrl.startsWith("/")) docUrl = `https://leaflet.pub${docUrl}`;
  let canonical = docUrl.startsWith("http")
    ? docUrl
    : `https://leaflet.pub/p/${encodeURIComponent(did)}/${params.rkey}`;

  return {
    alternates: { canonical },
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
    description: documentDescription(docRecord),
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
  //
  // Temporary, not permanent: handles are reassignable, and a 308 is cached by
  // browsers indefinitely, so a handle that later moves to another account
  // would keep sending that visitor to the old DID's post. Search engines
  // consolidate off the canonical tag above instead, which re-resolves on
  // every crawl. Same reasoning at the other handle→DID redirects.
  if (didOrHandle !== did)
    redirect(`/p/${encodeURIComponent(did)}/${params.rkey}`);

  return <DocumentPageRenderer did={did} rkey={params.rkey} />;
}
