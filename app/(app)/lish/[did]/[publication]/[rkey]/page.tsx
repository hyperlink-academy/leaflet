import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";
import { DocumentPageRenderer } from "./DocumentPageRenderer";
import { fetchPublicationForPage } from "../getPublicationForPage";
import { tryRenderPublicationPage } from "../tryRenderPublicationPage";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import {
  documentUriFilter,
  publicationNameOrUriFilter,
} from "src/utils/uriHelpers";
import { getDocumentURL } from "app/(app)/lish/createPub/getPublicationURL";
import { findPublishedPage } from "src/utils/publishedPageMetadata";

export async function generateMetadata(props: {
  params: Promise<{ publication: string; did: string; rkey: string }>;
}): Promise<Metadata> {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  let publication_name = decodeURIComponent(params.publication);
  let rkey = decodeURIComponent(params.rkey);
  if (!did) return { title: "Publication 404" };

  let { data: pubs } = await supabaseServerClient
    .from("publications")
    .select("name, publication_pages(path, title, record_uri)")
    .eq("identity_did", did)
    .or(publicationNameOrUriFilter(did, publication_name))
    .order("uri", { ascending: false })
    .limit(1);
  // Match the same way the page body does (tryRenderPublicationPage), so
  // metadata and body never disagree about which page a URL serves.
  let match = findPublishedPage(pubs?.[0]?.publication_pages, "/" + rkey);
  if (match && match.record_uri) {
    return {
      title: `${match.title || match.path} - ${pubs?.[0]?.name}`,
    };
  }

  let [{ data: documents }] = await Promise.all([
    supabaseServerClient
      .from("documents")
      .select("*, documents_in_publications(publications(*))")
      .or(documentUriFilter(did, params.rkey))
      .order("uri", { ascending: false })
      .limit(1),
  ]);
  let document = documents?.[0];
  if (!document) return { title: "404" };

  const docRecord = normalizeDocumentRecord(document.data);
  if (!docRecord) return { title: "404" };

  let publication = document.documents_in_publications[0]?.publications;
  // Canonical URL points at the publication's blog domain so the post on
  // leaflet.pub (and its quote pages, which inherit this metadata) doesn't
  // compete with the custom-domain version in search results.
  let canonical: string | undefined;
  let feedTypes: Record<string, string> | undefined;
  if (publication) {
    let url = getDocumentURL(docRecord, document.uri, publication);
    if (url.startsWith("http")) canonical = url;
    let pubRecord = normalizePublicationRecord(publication.record);
    if (pubRecord?.url) {
      feedTypes = {
        "application/rss+xml": `${pubRecord.url}/rss`,
        "application/atom+xml": `${pubRecord.url}/atom`,
        "application/json": `${pubRecord.url}/json`,
      };
    }
  }

  return {
    alternates:
      canonical || feedTypes ? { canonical, types: feedTypes } : undefined,
    icons: {
      icon: {
        url:
          process.env.NODE_ENV === "development"
            ? `/lish/${did}/${params.publication}/icon`
            : "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      other: [
        {
          rel: "alternate",
          url: document.uri,
        },
        { rel: "site.standard.document", url: document.uri },
      ],
    },
    title:
      docRecord.title +
      " - " +
      document.documents_in_publications[0]?.publications?.name,
    description: docRecord?.description || "",
  };
}
export default async function Post(props: {
  params: Promise<{ publication: string; did: string; rkey: string }>;
}) {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  let publication_name = decodeURIComponent(params.publication);
  let rkey = decodeURIComponent(params.rkey);
  console.log("yo what");

  if (!did)
    return (
      <div className="p-4 text-lg text-center flex flex-col gap-4">
        <p className="font-bold">Sorry, we can&apos;t find that handle!</p>
        <p>
          This may be a glitch on our end. If the issue persists please{" "}
          <a href="mailto:contact@leaflet.pub">send us a note</a>.
        </p>
      </div>
    );

  // A /<rkey> URL is either a published publication page or a post; render the
  // matching page, else fall back to the single-post renderer.
  const publication = await fetchPublicationForPage(did, publication_name);
  console.log(publication);
  if (publication) {
    const pageRender = tryRenderPublicationPage({
      did,
      publication,
      path: "/" + rkey,
    });
    if (pageRender) return pageRender;
  }
  return <DocumentPageRenderer did={did} rkey={rkey} />;
}
