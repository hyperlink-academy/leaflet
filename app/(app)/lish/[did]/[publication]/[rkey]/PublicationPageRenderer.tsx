import {
  PubLeafletBlocksPostsList,
  PubLeafletPagesLinearDocument,
  PubLeafletPublicationPage,
} from "lexicons/api";
import { AtpAgent } from "@atproto/api";

import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";

import {
  PublicationBackgroundProvider,
  PublicationThemeProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { FontLoader } from "components/FontLoader";
import { LeafletContentProvider } from "contexts/LeafletContentContext";
import { DocumentProvider } from "contexts/DocumentContext";
import type { DocumentContextValue } from "contexts/DocumentContext";
import {
  type PublicationPostsListPost,
} from "../PublicationPostsList";
import { PublicationNav } from "../PublicationNav";
import { PublicationHeader } from "../PublicationHeader";
import { PublicationHomeLayout } from "../PublicationHomeLayout";
import { PublicationStickyHeader } from "../PublicationStickyHeader";
import { PublicationFullHeader } from "../PublicationFullHeader";
import { getPublicationURL } from "app/(app)/lish/createPub/getPublicationURL";
import { blobRefToSrc } from "src/utils/blobRefToSrc";

import { collectAndFetchBlockResources } from "./collectAndFetchBlockResources";
import { PostContent } from "./PostContent";

export type PublicationPageRecord = PubLeafletPublicationPage.Record;

type PublicationRow = {
  uri: string;
  name: string;
  identity_did: string;
  record: unknown;
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
  page: { id: number; path: string; title: string | null; record: PublicationPageRecord };
  publication: PublicationRow;
}) {
  const normalizedPublication = normalizePublicationRecord(publication.record);
  const pages = page.record.content.pages || [];
  const firstPage = pages[0];

  const allBlocks: PubLeafletPagesLinearDocument.Block[] =
    firstPage && firstPage.$type === "pub.leaflet.pages.linearDocument"
      ? ((firstPage as PubLeafletPagesLinearDocument.Main).blocks ?? [])
      : [];

  const agent = new AtpAgent({
    service: "https://public.api.bsky.app",
    fetch: (...args) =>
      fetch(args[0], {
        ...args[1],
        next: { revalidate: 3600 },
      }),
  });

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

  const hasPostsList = allBlocks.some((b) =>
    PubLeafletBlocksPostsList.isMain(b.block),
  );
  const postsListPosts: PublicationPostsListPost[] = hasPostsList
    ? (publication.documents_in_publications ?? [])
        .map((dip) => {
          if (!dip.documents) return null;
          const normalized = normalizeDocumentRecord(
            dip.documents.data,
            dip.documents.uri,
          );
          if (!normalized) return null;
          return {
            uri: dip.documents.uri,
            record: normalized,
            commentsCount: dip.documents.comments_on_documents?.[0]?.count || 0,
            mentionsCount:
              dip.documents.document_mentions_in_bsky?.[0]?.count || 0,
            recommendsCount:
              dip.documents.recommends_on_documents?.[0]?.count || 0,
          };
        })
        .filter((p): p is PublicationPostsListPost => p !== null)
    : [];

  const postsListData = hasPostsList
    ? {
        publication: { uri: publication.uri, record: publication.record },
        publicationRecord: normalizedPublication as NormalizedPublication | null,
        posts: postsListPosts,
      }
    : undefined;

  const theme = normalizedPublication?.theme;
  const showPageBackground = !!theme?.showPageBackground;

  const documentContextValue: DocumentContextValue = {
    uri: page.record.publication,
    normalizedDocument: null as unknown as DocumentContextValue["normalizedDocument"],
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
      newsletterMode: false,
      pages: (publication.publication_pages ?? []).filter((p) => p.record_uri),
    },
    comments: [],
    mentions: [],
    leafletId: null,
    recommendsCount: 0,
  };

  const navPages = (publication.publication_pages ?? []).filter(
    (p) => p.record_uri,
  );

  return (
    <DocumentProvider value={documentContextValue}>
      <LeafletContentProvider value={{ pages }}>
        <FontLoader
          headingFontId={theme?.headingFont}
          bodyFontId={theme?.bodyFont}
        />
        <PublicationThemeProvider
          theme={theme}
          pub_creator={publication.identity_did}
        >
          <PublicationBackgroundProvider
            theme={theme}
            pub_creator={publication.identity_did}
          >
            <PublicationHomeLayout
              uri={publication.uri}
              showPageBackground={showPageBackground}
              stickyHeader={
                navPages.length > 0 ? (
                  <PublicationStickyHeader
                    nav={
                      <PublicationNav
                        publicationUrl={getPublicationURL(publication)}
                        pages={navPages}
                        activePath={page.path}
                      />
                    }
                  >
                    <PublicationHeader
                      variant="inline"
                      iconUrl={
                        normalizedPublication?.icon
                          ? blobRefToSrc(normalizedPublication.icon.ref, did)
                          : undefined
                      }
                      publicationName={publication.name}
                    />
                  </PublicationStickyHeader>
                ) : (
                  <PublicationFullHeader>
                    <PublicationHeader
                      iconUrl={
                        normalizedPublication?.icon
                          ? blobRefToSrc(normalizedPublication.icon.ref, did)
                          : undefined
                      }
                      publicationName={publication.name}
                      description={normalizedPublication?.description}
                    />
                  </PublicationFullHeader>
                )
              }
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
