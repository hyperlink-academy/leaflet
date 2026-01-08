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
  ExpandedInteractions,
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
import { SharedPageProps } from "./PostPages";
import { PostPrevNextButtons } from "./PostPrevNextButtons";

export function LinearDocumentPage({
  blocks,
  ...props
}: Omit<SharedPageProps, "allPages"> & {
  blocks: PubLeafletPagesLinearDocument.Block[];
}) {
  const {
    document,
    did,
    profile,
    preferences,
    pubRecord,
    theme,
    prerenderedCodeBlocks,
    bskyPostData,
    pollData,
    document_uri,
    pageId,
    pageOptions,
    fullPageScroll,
    hasPageBackground,
  } = props;
  let drawer = useDrawerOpen(document_uri);

  if (!document) return null;

  let record = document.data as PubLeafletDocument.Record;

  const isSubpage = !!pageId;

  console.log("prev/next?: " + preferences.showPrevNext);

  return (
    <>
      <PageWrapper
        pageType="doc"
        fullPageScroll={fullPageScroll}
        id={`post-page-${pageId ?? document_uri}`}
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
        <PostPrevNextButtons
          showPrevNext={preferences.showPrevNext && !isSubpage}
        />
        <ExpandedInteractions
          pageId={pageId}
          showComments={preferences.showComments}
          commentsCount={getCommentCount(document, pageId) || 0}
          quotesCount={getQuoteCount(document, pageId) || 0}
        />
        {!hasPageBackground && <div className={`spacer h-8 w-full`} />}
      </PageWrapper>
    </>
  );
}
