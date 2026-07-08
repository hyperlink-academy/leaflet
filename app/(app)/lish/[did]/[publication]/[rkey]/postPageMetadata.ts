import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import { resolveDocumentFilter } from "../resolveDocumentFilter";
import { getDocumentURL } from "app/(app)/lish/createPub/getPublicationURL";
import { findPublishedPage } from "src/utils/publishedPageMetadata";
import { publicationAlternates } from "../publicationAlternates";

/**
 * Metadata for whatever is published at /<segment> of a publication — a
 * published publication page or a post. Returns null when nothing is published
 * there so callers decide the fallback: the [rkey] route falls back to a 404
 * title, /archive falls back to its own archive metadata.
 *
 * `publication` and `segment` are the raw (still URI-encoded) route params.
 */
export async function postPageMetadata(props: {
  did: string;
  publication: string;
  segment: string;
}): Promise<Metadata | null> {
  let did = decodeURIComponent(props.did);
  let publication_name = decodeURIComponent(props.publication);
  let segment = decodeURIComponent(props.segment);

  let { data: pubs } = await supabaseServerClient
    .from("publications")
    .select("name, record, publication_pages(path, title, record_uri)")
    .eq("identity_did", did)
    .or(publicationNameOrUriFilter(did, publication_name))
    .order("uri", { ascending: false })
    .limit(1);
  // Match the same way the page body does (tryRenderPublicationPage), so
  // metadata and body never disagree about which page a URL serves.
  let match = findPublishedPage(pubs?.[0]?.publication_pages, "/" + segment);
  if (match && match.record_uri) {
    return {
      title: `${match.title || match.path} - ${pubs?.[0]?.name}`,
      alternates: publicationAlternates(
        normalizePublicationRecord(pubs?.[0]?.record),
        "/" + segment,
      ),
    };
  }

  let [{ data: documents }] = await Promise.all([
    supabaseServerClient
      .from("documents")
      .select("*, documents_in_publications(publications(*))")
      .or(await resolveDocumentFilter(did, publication_name, segment))
      .order("uri", { ascending: false })
      .limit(1),
  ]);
  let document = documents?.[0];
  if (!document) return null;

  const docRecord = normalizeDocumentRecord(document.data);
  if (!docRecord) return null;

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
        "application/feed+json": `${pubRecord.url}/json`,
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
            ? `/lish/${did}/${props.publication}/icon`
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
