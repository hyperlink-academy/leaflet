import {
  PubLeafletBlocksPostsList,
  PubLeafletPagesLinearDocument,
  PubLeafletPublicationPage,
} from "lexicons/api";
import { AtpAgent } from "@atproto/api";

import {
  normalizePublicationRecord,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";
import { resolvePublicationTheme } from "lexicons/src/normalize";

import {
  PublicationBackgroundProvider,
  PublicationThemeProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { FontLoader } from "components/FontLoader";
import { LeafletContentProvider } from "contexts/LeafletContentContext";
import { DocumentProvider } from "contexts/DocumentContext";
import type { DocumentContextValue } from "contexts/DocumentContext";
import { buildPublicationPosts } from "../buildPublicationPosts";
import {
  POSTS_LIST_PAGE_SIZE,
  postsListFilterKey,
  sortPostsForList,
  filterPostsByTags,
} from "../postsListPagination";
import { PublicationHomeLayout } from "../PublicationHomeLayout";
import { getPublicationURL } from "app/(published)/lish/createPub/getPublicationURL";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { wordmarkFromTheme } from "src/utils/wordmark";
import { publishedNavPages } from "src/utils/publishedPageMetadata";

import { collectAndFetchBlockResources } from "./collectAndFetchBlockResources";
import { PostContent } from "./PostContent";
import { getProfiles } from "src/identity";
import { attachBylineProfiles, bylineDidsForPosts } from "src/utils/byline";

export type PublicationPageRecord = PubLeafletPublicationPage.Record;

type PublicationRow = {
  uri: string;
  name: string;
  identity_did: string;
  record: unknown;
  publication_newsletter_settings?: { enabled: boolean } | null;
  publication_pages?: {
    id: number;
    path: string | null;
    title: string;
    record_uri: string | null;
    sort_order: string;
  }[];
  documents_in_publications?: {
    documents: {
      uri: string;
      data: unknown;
      comments_on_documents?: { count: number }[];
      document_mentions_in_bsky?: { count: number }[];
      recommends_on_documents?: { count: number }[];
    } | null;
  }[];
};

export async function PublicationPageRenderer({
  did,
  page,
  publication,
}: {
  did: string;
  page: {
    id: number;
    path: string;
    title: string | null;
    record: PublicationPageRecord;
  };
  publication: PublicationRow;
}) {
  const normalizedPublication = normalizePublicationRecord(publication.record);
  const pages = page.record.content.pages || [];
  const firstPage = pages[0];

  const allBlocks: PubLeafletPagesLinearDocument.Block[] =
    firstPage && firstPage.$type === "pub.leaflet.pages.linearDocument"
      ? (firstPage as PubLeafletPagesLinearDocument.Main).blocks ?? []
      : [];

  const agent = new AtpAgent({ service: "https://public.api.bsky.app" });

  const resourcePages =
    firstPage && firstPage.$type === "pub.leaflet.pages.linearDocument"
      ? [firstPage as PubLeafletPagesLinearDocument.Main]
      : [];

  const {
    bskyPostData,
    standardSitePostData: standardSitePosts,
    pollData,
    prerenderedCodeBlocks,
  } = await collectAndFetchBlockResources({ agent, pages: resourcePages });

  const postsListBlocks = allBlocks.filter((b) =>
    PubLeafletBlocksPostsList.isMain(b.block),
  );

  // The page query already loaded every document, so build the list in memory.
  // Per distinct tag-filter signature, ship the full ordered URI list plus a
  // byline-resolved first batch (in the SSR HTML); the client hydrates later
  // batches by URI on scroll via getPostsByUris.
  const allPosts = postsListBlocks.length
    ? buildPublicationPosts(publication.documents_in_publications)
    : [];
  const distinctFilters = new Map<string, string[] | undefined>();
  for (const b of postsListBlocks) {
    const filterByTags = (b.block as PubLeafletBlocksPostsList.Main)
      .filterByTags;
    distinctFilters.set(postsListFilterKey(filterByTags), filterByTags);
  }
  const initialByFilterEntries = await Promise.all(
    Array.from(distinctFilters.entries()).map(async ([key, tags]) => {
      const ordered = sortPostsForList(filterPostsByTags(allPosts, tags));
      const firstBatch = ordered.slice(0, POSTS_LIST_PAGE_SIZE);
      const initialPosts = attachBylineProfiles(
        firstBatch,
        await getProfiles(bylineDidsForPosts(firstBatch)),
      );
      return [
        key,
        { uris: ordered.map((p) => p.uri), initialPosts },
      ] as const;
    }),
  );

  const postsListData = postsListBlocks.length
    ? {
        publication: { uri: publication.uri, record: publication.record },
        publicationRecord:
          normalizedPublication as NormalizedPublication | null,
        initialByFilter: Object.fromEntries(initialByFilterEntries),
      }
    : undefined;

  const theme = resolvePublicationTheme(normalizedPublication);
  const showPageBackground = !!theme?.showPageBackground;

  const documentContextValue: DocumentContextValue = {
    uri: page.record.publication,
    normalizedDocument:
      null as unknown as DocumentContextValue["normalizedDocument"],
    normalizedPublication,
    theme,
    prevNext: undefined,
    quotesAndMentions: [],
    publication: {
      uri: publication.uri,
      name: publication.name,
      identity_did: publication.identity_did,
      record: publication.record as NonNullable<
        DocumentContextValue["publication"]
      >["record"],
      publication_subscriptions: [],
      newsletterMode: !!publication.publication_newsletter_settings?.enabled,
      pages: (publication.publication_pages ?? []).filter((p) => p.record_uri),
    },
    commentsCount: 0,
    commentsCountByPage: {},
    mentions: [],
    leafletId: null,
    recommendsCount: 0,
  };

  // publication_pages rows are published state, so the nav reads them directly.
  const navPages = publishedNavPages(publication.publication_pages);

  return (
    <DocumentProvider value={documentContextValue}>
      <LeafletContentProvider value={{ pages }}>
        <FontLoader
          headingFontId={theme?.headingFont}
          bodyFontId={theme?.bodyFont}
        />
        <PublicationThemeProvider
          record={normalizedPublication}
          pub_creator={publication.identity_did}
        >
          <PublicationBackgroundProvider
            record={normalizedPublication}
            pub_creator={publication.identity_did}
          >
            <PublicationHomeLayout
              showPageBackground={showPageBackground}
              pageWidth={normalizedPublication?.theme?.pageWidth}
              iconUrl={
                normalizedPublication?.icon
                  ? blobRefToSrc(normalizedPublication.icon.ref, did)
                  : undefined
              }
              wordmark={wordmarkFromTheme(normalizedPublication?.theme, did)}
              navPages={navPages}
              publicationUrl={getPublicationURL(publication)}
              activePath={page.path}
              subscribe={{
                publicationUri: publication.uri,
                publicationUrl: normalizedPublication?.url,
                publicationName:
                  normalizedPublication?.name ?? publication.name,
                publicationDescription: normalizedPublication?.description,
                newsletterMode:
                  !!publication.publication_newsletter_settings?.enabled,
              }}
            >
              <div className="pubPageContent pt-6">
                <PostContent
                  blocks={allBlocks}
                  did={did}
                  pages={pages as PubLeafletPagesLinearDocument.Main[]}
                  bskyPostData={JSON.parse(JSON.stringify(bskyPostData))}
                  standardSitePostData={JSON.parse(
                    JSON.stringify(standardSitePosts),
                  )}
                  pollData={pollData}
                  prerenderedCodeBlocks={prerenderedCodeBlocks}
                  postsListData={postsListData}
                />
              </div>
            </PublicationHomeLayout>
          </PublicationBackgroundProvider>
        </PublicationThemeProvider>
      </LeafletContentProvider>
    </DocumentProvider>
  );
}
