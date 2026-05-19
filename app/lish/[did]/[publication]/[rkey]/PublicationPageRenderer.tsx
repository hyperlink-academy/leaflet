import { ids } from "lexicons/api/lexicons";
import {
  PubLeafletBlocksBskyPost,
  PubLeafletBlocksPoll,
  PubLeafletBlocksPostsList,
  PubLeafletBlocksStandardSitePost,
  PubLeafletBlocksOrderedList,
  PubLeafletBlocksUnorderedList,
  PubLeafletPagesLinearDocument,
  PubLeafletPublicationPage,
} from "lexicons/api";
import { type $Typed } from "lexicons/api/util";
import { AtpAgent } from "@atproto/api";

import { supabaseServerClient } from "supabase/serverClient";
import {
  normalizeDocumentRecord,
  normalizePublicationRecord,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";
import { get_standard_site_posts } from "app/api/rpc/[command]/get_standard_site_posts";

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

import { extractCodeBlocks } from "./extractCodeBlocks";
import { fetchPollData } from "./fetchPollData";
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

  const bskyPostBlocks = extractBlocksByType<
    $Typed<PubLeafletBlocksBskyPost.Main>
  >(allBlocks, ids.PubLeafletBlocksBskyPost);
  const bskyPostBatches: typeof bskyPostBlocks[] = [];
  for (let i = 0; i < bskyPostBlocks.length; i += 25) {
    bskyPostBatches.push(bskyPostBlocks.slice(i, i + 25));
  }
  const bskyPostResponses = await Promise.all(
    bskyPostBatches.map((batch) =>
      agent.getPosts(
        { uris: batch.map((p) => p.block.postRef.uri) },
        { headers: {} },
      ),
    ),
  );
  const bskyPostData = bskyPostResponses.flatMap((r) => r.data.posts);

  const standardSitePostUris = Array.from(
    new Set(
      extractBlocksByType<$Typed<PubLeafletBlocksStandardSitePost.Main>>(
        allBlocks,
        ids.PubLeafletBlocksStandardSitePost,
      ).map((b) => b.block.uri),
    ),
  );
  const standardSitePostsResult =
    standardSitePostUris.length > 0
      ? await get_standard_site_posts.handler(
          { uris: standardSitePostUris },
          { supabase: supabaseServerClient },
        )
      : { result: { posts: [] } };
  const standardSitePosts = standardSitePostsResult.result.posts;

  const pollBlocks = extractBlocksByType<$Typed<PubLeafletBlocksPoll.Main>>(
    allBlocks,
    ids.PubLeafletBlocksPoll,
  );
  const pollData = await fetchPollData(
    pollBlocks.map((b) => b.block.pollRef.uri),
  );

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

  const prerenderedCodeBlocks = await extractCodeBlocks(allBlocks);

  const theme = normalizedPublication?.theme;
  const showPageBackground = !!theme?.showPageBackground;
  const profileResp = await agent.getProfile({ actor: did }).then(
    (res) => res.data,
    () => undefined,
  );

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
            >
              <PublicationHeader
                iconUrl={
                  normalizedPublication?.icon
                    ? `/api/atproto_images?did=${did}&cid=${(normalizedPublication.icon.ref as unknown as { $link: string })["$link"]}`
                    : undefined
                }
                publicationName={publication.name}
                description={normalizedPublication?.description}
                author={
                  profileResp ? (
                    <span className="text-sm text-secondary">
                      by {profileResp.displayName || profileResp.handle}
                    </span>
                  ) : undefined
                }
              />
              <PublicationNav
                did={did}
                publicationName={publication.name}
                pages={(publication.publication_pages ?? []).filter(
                  (p) => p.record_uri,
                )}
                activePath={page.path}
              />
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

function extractBlocksByType<T extends { $type: string }>(
  blocks: PubLeafletPagesLinearDocument.Block[],
  type: string,
): { block: T }[] {
  const results: { block: T }[] = [];
  for (const b of blocks) {
    if (b.block.$type === type) {
      results.push(b as unknown as { block: T });
    }
    if (
      b.block.$type === ids.PubLeafletBlocksOrderedList ||
      b.block.$type === ids.PubLeafletBlocksUnorderedList
    ) {
      const list = b.block as
        | PubLeafletBlocksOrderedList.Main
        | PubLeafletBlocksUnorderedList.Main;
      extractFromListItems(list.children, type, results);
    }
  }
  return results;
}

function extractFromListItems<T extends { $type: string }>(
  items:
    | PubLeafletBlocksOrderedList.ListItem[]
    | PubLeafletBlocksUnorderedList.ListItem[],
  type: string,
  results: { block: T }[],
) {
  for (const item of items) {
    if ((item.content as { $type?: string })?.$type === type) {
      results.push({ block: item.content as unknown as T });
    }
    if (item.children) {
      extractFromListItems(item.children, type, results);
    }
    const orderedChildren = (item as PubLeafletBlocksUnorderedList.ListItem)
      .orderedListChildren;
    if (orderedChildren) {
      extractFromListItems(orderedChildren.children, type, results);
    }
    const unorderedChildren = (item as PubLeafletBlocksOrderedList.ListItem)
      .unorderedListChildren;
    if (unorderedChildren) {
      extractFromListItems(unorderedChildren.children, type, results);
    }
  }
}
