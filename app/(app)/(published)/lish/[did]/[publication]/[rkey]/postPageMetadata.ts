import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";
import {
  hasLeafletContent,
  normalizeDocumentRecord,
  normalizePublicationRecord,
  type NormalizedDocument,
} from "src/utils/normalizeRecords";
import { PubLeafletPagesLinearDocument } from "lexicons/api";
import { truncateBlocksAtMembersDelimiter } from "src/membership";
import { resolveDocumentFilter } from "src/utils/resolveDocumentFilter";
import { getDocumentURL, getPublicationURL } from "src/utils/getPublicationURL";
import { findPublishedPage } from "src/utils/publishedPageMetadata";
import { publicationAlternates } from "../publicationAlternates";
import { fetchPublicationForPage } from "../getPublicationForPage";
import { blocksToPlainText } from "../feedHtml";

const absolutize = (url: string) =>
  url.startsWith("/") ? `https://leaflet.pub${url}` : url;

// Meta description for a document: the record's own description, else a
// plain-text excerpt of its first blocks — never past the members-only
// delimiter, since metadata is public regardless of gating. Undefined
// (rather than "") when there's nothing, so the tag is omitted and search
// engines write their own snippet.
export function documentDescription(
  docRecord: NormalizedDocument | null,
): string | undefined {
  if (!docRecord) return undefined;
  if (docRecord.description) return docRecord.description;
  let blocks: PubLeafletPagesLinearDocument.Block[] = [];
  if (hasLeafletContent(docRecord) && docRecord.content.pages[0]) {
    let firstPage = docRecord.content.pages[0];
    if (PubLeafletPagesLinearDocument.isMain(firstPage))
      blocks = firstPage.blocks || [];
  }
  let text = blocksToPlainText(truncateBlocksAtMembersDelimiter(blocks));
  if (!text) return undefined;
  return text.length > 160 ? text.slice(0, 157).trimEnd() + "…" : text;
}

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

  // The same fetcher the page body uses, so the two share one query.
  let pub = await fetchPublicationForPage(did, publication_name);
  // Match the same way the page body does (tryRenderPublicationPage), so
  // metadata and body never disagree about which page a URL serves.
  let match = findPublishedPage(pub?.publication_pages, "/" + segment);
  if (match && match.record_uri) {
    return {
      title: `${match.title || match.path} - ${pub?.name}`,
      description: documentDescription(normalizeDocumentRecord(match.record)),
      alternates: publicationAlternates(
        normalizePublicationRecord(pub?.record),
        "/" + segment,
        pub ?? undefined,
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
  let other: Metadata["other"] = {
    "at:canonical": document.uri,
  };
  let pubName: string | undefined;
  if (publication) {
    let pubRecord = normalizePublicationRecord(publication.record);
    pubName = publication.name || pubRecord?.name || undefined;
    let url = absolutize(getDocumentURL(docRecord, document.uri, publication));
    if (url.startsWith("http")) canonical = url;
    // Legacy pub.leaflet publications without a configured domain don't
    // normalize (no URL) but are still browsable at leaflet.pub/lish/…, so
    // their posts advertise feeds there rather than none (same fallback as
    // generateFeed).
    let feedBase = absolutize(
      pubRecord?.url ?? getPublicationURL(publication),
    ).replace(/\/+$/, "");
    feedTypes = {
      "application/rss+xml": `${feedBase}/rss`,
      "application/atom+xml": `${feedBase}/atom`,
      "application/feed+json": `${feedBase}/json`,
    };
    other["at:alternate"] = publication.uri;
  }

  let authors = docRecord.contributors?.flatMap((c) =>
    c.displayName ? [c.displayName] : [],
  );

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
    title: pubName
      ? docRecord.title
        ? `${docRecord.title} - ${pubName}`
        : pubName
      : docRecord.title,
    description: documentDescription(docRecord),
    // og:image still comes from the route's opengraph-image file — file-based
    // metadata takes priority over this object, so only the article fields
    // are set here.
    openGraph: {
      type: "article",
      publishedTime: docRecord.publishedAt,
      url: canonical,
      siteName: pubName,
      authors: authors?.length ? authors : undefined,
    },
    other,
  };
}
