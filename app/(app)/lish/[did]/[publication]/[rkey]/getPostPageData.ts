import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
} from "src/utils/normalizeRecords";
import { resolvePublicationTheme } from "lexicons/src/normalize";
import {
  PubLeafletComment,
  PubLeafletPublication,
  SiteStandardPublication,
} from "lexicons/api";
import { documentUriFilter } from "src/utils/uriHelpers";
import { getDocumentURL } from "app/(app)/lish/createPub/getPublicationURL";
import { getIdentityData } from "actions/getIdentityData";
import { getDocumentPages } from "src/utils/normalizeRecords";
import {
  isActiveMembership,
  postHasMembersDelimiter,
  truncatePagesAtMembersDelimiter,
} from "src/membership";
import { getReaderMembership } from "src/membership.server";
import { resolveDocumentFilter } from "../resolveDocumentFilter";

export async function getPostPageData(
  did: string,
  rkey: string,
  publicationName?: string,
) {
  let filter = publicationName
    ? await resolveDocumentFilter(did, publicationName, rkey)
    : documentUriFilter(did, rkey);
  let { data: documents } = await supabaseServerClient
    .from("documents")
    .select(
      `
        data,
        uri,
        comments_on_documents(record),
        documents_in_publications(publications(*,
          documents_in_publications(documents(uri, sort_date, title:data->>title, publishedAt:data->>publishedAt)),
          publication_subscriptions(*),
          publication_newsletter_settings(enabled),
          publication_membership_settings(enabled),
          publication_membership_tiers(id, name, description, monthly_price_cents, annual_price_cents, currency, active, sort_order),
          publication_contributors(contributor_did, confirmed),
          publication_pages(id, path, title, record_uri, sort_order))
        ),
        document_mentions_in_bsky(*),
        leaflets_in_publications(*),
        recommends_on_documents(count)
        `,
    )
    .or(filter)
    .order("uri", { ascending: false })
    .limit(1);
  let document = documents?.[0];

  if (!document) return null;

  // Normalize the document record - this is the primary way consumers should access document data
  const normalizedDocument = normalizeDocumentRecord(
    document.data,
    document.uri,
  );
  if (!normalizedDocument) return null;

  // Normalize the publication record - this is the primary way consumers should access publication data
  const normalizedPublication = normalizePublicationRecord(
    document.documents_in_publications[0]?.publications?.record,
  );

  // Members-only gating: when the publication has paid memberships enabled and
  // the post's first page carries a delimiter, drop everything after it before
  // the record leaves the server — non-members' payloads never contain the
  // gated blocks. Owners, confirmed contributors, and active members see all.
  const gatePub = document.documents_in_publications[0]?.publications;
  const membershipTiers = (gatePub?.publication_membership_tiers ?? [])
    .filter((t) => t.active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      monthly_price_cents: t.monthly_price_cents,
      annual_price_cents: t.annual_price_cents,
      currency: t.currency,
    }));
  let membersOnly: { gated: boolean; tiers: typeof membershipTiers } = {
    gated: false,
    tiers: [],
  };
  if (
    gatePub?.publication_membership_settings?.enabled &&
    postHasMembersDelimiter(normalizedDocument)
  ) {
    const identity = await getIdentityData();
    const viewerDid = identity?.atp_did;
    let entitled =
      !!viewerDid &&
      (gatePub.identity_did === viewerDid ||
        gatePub.publication_contributors.some(
          (c) => c.contributor_did === viewerDid && c.confirmed,
        ));
    if (!entitled && identity) {
      entitled = isActiveMembership(
        await getReaderMembership(gatePub.uri, identity.id),
      );
    }
    if (!entitled) {
      const pages = getDocumentPages(normalizedDocument);
      if (pages) truncatePagesAtMembersDelimiter(pages);
      membersOnly = { gated: true, tiers: membershipTiers };
    }
  }

  // Fetch constellation backlinks for mentions
  const postUrl = getDocumentURL(normalizedDocument, document.uri, normalizedPublication);
  // Constellation needs an absolute URL
  const absolutePostUrl = postUrl.startsWith("/")
    ? `https://leaflet.pub${postUrl}`
    : postUrl;
  const constellationBacklinks = await getConstellationBacklinks(absolutePostUrl);

  // Deduplicate constellation backlinks (same post could appear in both links and embeds)
  const uniqueBacklinks = Array.from(
    new Map(constellationBacklinks.map((b) => [b.uri, b])).values(),
  );

  // Combine database mentions (already deduplicated by DB constraint) and constellation backlinks
  const quotesAndMentions: { uri: string; link?: string }[] = [
    // Database mentions (quotes with link to quoted content)
    ...document.document_mentions_in_bsky.map((m) => ({
      uri: m.uri,
      link: m.link,
    })),
    // Constellation backlinks (direct post mentions without quote context)
    ...uniqueBacklinks,
  ];

  let theme =
    resolvePublicationTheme(normalizedPublication) || normalizedDocument?.theme;

  // Calculate prev/next documents from the fetched publication documents
  let prevNext:
    | {
        prev?: { uri: string; title: string };
        next?: { uri: string; title: string };
        first?: { uri: string; title: string };
        last?: { uri: string; title: string };
      }
    | undefined;

  const currentPublishedAt = normalizedDocument.publishedAt;
  const allDocs =
    document.documents_in_publications[0]?.publications
      ?.documents_in_publications;

  if (currentPublishedAt && allDocs) {
    // The publishedAt filter mirrors normalizeDocumentRecord's gating of
    // unpublished pub.leaflet records without paying for the full data jsonb
    // of every sibling post.
    const sortedDocs = allDocs
      .flatMap((dip) => (dip.documents ? [dip.documents] : []))
      .filter((doc) => doc.publishedAt && doc.title)
      .sort(
        (a, b) =>
          new Date(a.sort_date || 0).getTime() -
          new Date(b.sort_date || 0).getTime(),
      );

    // Find current document index
    const currentIndex = sortedDocs.findIndex(
      (doc) => doc.uri === document.uri,
    );

    if (currentIndex !== -1) {
      const lastIndex = sortedDocs.length - 1;
      prevNext = {
        prev:
          currentIndex > 0
            ? {
                uri: sortedDocs[currentIndex - 1].uri || "",
                title: sortedDocs[currentIndex - 1].title || "",
              }
            : undefined,
        next:
          currentIndex < lastIndex
            ? {
                uri: sortedDocs[currentIndex + 1].uri || "",
                title: sortedDocs[currentIndex + 1].title || "",
              }
            : undefined,
        first:
          currentIndex > 0
            ? {
                uri: sortedDocs[0].uri || "",
                title: sortedDocs[0].title || "",
              }
            : undefined,
        last:
          currentIndex < lastIndex
            ? {
                uri: sortedDocs[lastIndex].uri || "",
                title: sortedDocs[lastIndex].title || "",
              }
            : undefined,
      };
    }
  }

  // Build explicit publication context for consumers
  const rawPub = document.documents_in_publications[0]?.publications;
  // The embedded sibling documents were only fetched to compute prevNext;
  // shipping every post's full record to the client would leak members-only
  // content (and bloat the payload).
  if (rawPub) rawPub.documents_in_publications = [];
  const publication = rawPub
    ? {
        uri: rawPub.uri,
        name: rawPub.name,
        identity_did: rawPub.identity_did,
        record: rawPub.record as
          | PubLeafletPublication.Record
          | SiteStandardPublication.Record
          | null,
        publication_subscriptions: rawPub.publication_subscriptions || [],
        newsletterMode: !!rawPub.publication_newsletter_settings?.enabled,
        pages: (rawPub.publication_pages || []).filter((p) => p.record_uri),
      }
    : null;
  const recommendsCount = document.recommends_on_documents?.[0]?.count ?? 0;

  // Comments are counted per-page so subpages (and the main page) each show only
  // their own discussion. Comments on the main page have no `onPage`, so they're
  // keyed under "". `commentsCount` remains the document-wide total.
  const commentRecords = document.comments_on_documents ?? [];
  const commentsCountByPage: Record<string, number> = {};
  for (const c of commentRecords) {
    const onPage = (c.record as PubLeafletComment.Record)?.onPage ?? "";
    commentsCountByPage[onPage] = (commentsCountByPage[onPage] ?? 0) + 1;
  }
  const commentsCount = commentRecords.length;

  return {
    ...document,
    // Pre-normalized data - consumers should use these instead of normalizing themselves
    normalizedDocument,
    normalizedPublication,
    postUrl,
    quotesAndMentions,
    theme,
    prevNext,
    membersOnly,
    // Explicit relational data for DocumentContext
    publication,
    commentsCount,
    commentsCountByPage,
    mentions: document.document_mentions_in_bsky,
    leafletId: document.leaflets_in_publications[0]?.leaflet || null,
    // Recommends data
    recommendsCount,
  };
}

export type PostPageData = Awaited<ReturnType<typeof getPostPageData>>;

const headers = {
  "Content-type": "application/json",
  "user-agent": "leaflet.pub",
};

// Fetch constellation backlinks without hydrating with Bluesky post data
export async function getConstellationBacklinks(
  url: string,
): Promise<{ uri: string }[]> {
  try {
    let baseURL = `https://constellation.microcosm.blue/xrpc/blue.microcosm.links.getBacklinks?subject=${encodeURIComponent(url)}`;
    let externalEmbeds = new URL(
      `${baseURL}&source=${encodeURIComponent("app.bsky.feed.post:embed.external.uri")}`,
    );
    let linkFacets = new URL(
      `${baseURL}&source=${encodeURIComponent("app.bsky.feed.post:facets[].features[app.bsky.richtext.facet#link].uri")}`,
    );

    let [links, embeds] = (await Promise.all([
      fetch(linkFacets, { headers, next: { revalidate: 3600 } }).then((req) =>
        req.json(),
      ),
      fetch(externalEmbeds, { headers, next: { revalidate: 3600 } }).then(
        (req) => req.json(),
      ),
    ])) as ConstellationResponse[];

    let uris = [...links.records, ...embeds.records].map((i) =>
      AtUri.make(i.did, i.collection, i.rkey).toString(),
    );

    return uris.map((uri) => ({ uri }));
  } catch (e) {
    return [];
  }
}

type ConstellationResponse = {
  records: { did: string; collection: string; rkey: string }[];
};
