"use client";
import {
  PubLeafletComment,
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
  PubLeafletPublication,
} from "lexicons/api";
import { PostPageData } from "./getPostPageData";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { SubscribeWithBluesky } from "app/lish/Subscribe";
import { EditTiny } from "components/Icons/EditTiny";
import {
  getCommentCount,
  getQuoteCount,
  Interactions,
} from "./Interactions/Interactions";
import { PostContent } from "./PostContent";
import { PostHeader } from "./PostHeader/PostHeader";
import { useIdentityData } from "components/IdentityProvider";
import { AppBskyFeedDefs } from "@atproto/api";
import { useDrawerOpen } from "./Interactions/InteractionDrawer";
import { PageWrapper } from "components/Pages/Page";
import { decodeQuotePosition } from "./quotePosition";
import { PollData } from "./fetchPollData";

export function LinearDocumentPage({
  document,
  blocks,
  did,
  profile,
  preferences,
  pubRecord,
  prerenderedCodeBlocks,
  bskyPostData,
  document_uri,
  pageId,
  pageOptions,
  pollData,
  fullPageScroll,
}: {
  document_uri: string;
  document: PostPageData;
  blocks: PubLeafletPagesLinearDocument.Block[];
  profile?: ProfileViewDetailed;
  pubRecord: PubLeafletPublication.Record;
  did: string;
  prerenderedCodeBlocks?: Map<string, string>;
  bskyPostData: AppBskyFeedDefs.PostView[];
  pollData: PollData[];
  preferences: { showComments?: boolean };
  pageId?: string;
  pageOptions?: React.ReactNode;
  fullPageScroll: boolean;
}) {
  let { identity } = useIdentityData();
  let drawer = useDrawerOpen(document_uri);

  if (!document || !document.documents_in_publications[0].publications)
    return null;

  let hasPageBackground = !!pubRecord.theme?.showPageBackground;
  let record = document.data as PubLeafletDocument.Record;

  const isSubpage = !!pageId;

  return (
    <>
      <PageWrapper
        pageType="doc"
        fullPageScroll={fullPageScroll}
        cardBorderHidden={!hasPageBackground}
        id={pageId ? `post-page-${pageId}` : "post-page"}
        drawerOpen={
          !!drawer && (pageId ? drawer.pageId === pageId : !drawer.pageId)
        }
        pageOptions={pageOptions}
      >
        {!isSubpage && profile && (
          <PostHeader
            data={document}
            profile={profile}
            preferences={preferences}
          />
        )}
        <PostContent
          pollData={pollData}
          pages={record.pages as PubLeafletPagesLinearDocument.Main[]}
          pageId={pageId}
          bskyPostData={bskyPostData}
          blocks={blocks}
          did={did}
          prerenderedCodeBlocks={prerenderedCodeBlocks}
        />
        <Interactions
          pageId={pageId}
          showComments={preferences.showComments}
          commentsCount={getCommentCount(document, pageId) || 0}
          quotesCount={getQuoteCount(document, pageId) || 0}
        />
        {!isSubpage && (
          <>
            <hr className="border-border-light mb-4 mt-4 sm:mx-4 mx-3" />
            <div className="sm:px-4 px-3">
              {identity &&
              identity.atp_did ===
                document.documents_in_publications[0]?.publications
                  ?.identity_did ? (
                <a
                  href={`https://leaflet.pub/${document.leaflets_in_publications[0]?.leaflet}`}
                  className="flex gap-2 items-center hover:!no-underline selected-outline px-2 py-0.5 bg-accent-1 text-accent-2 font-bold w-fit rounded-lg !border-accent-1 !outline-accent-1 mx-auto"
                >
                  <EditTiny /> Edit Post
                </a>
              ) : (
                <SubscribeWithBluesky
                  isPost
                  base_url={getPublicationURL(
                    document.documents_in_publications[0].publications,
                  )}
                  pub_uri={
                    document.documents_in_publications[0].publications.uri
                  }
                  subscribers={
                    document.documents_in_publications[0].publications
                      .publication_subscriptions
                  }
                  pubName={
                    document.documents_in_publications[0].publications.name
                  }
                />
              )}
            </div>
          </>
        )}
      </PageWrapper>
    </>
  );
}
