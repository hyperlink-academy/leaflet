"use client";
import { PubLeafletPagesLinearDocument } from "lexicons/api";
import { useLeafletContent } from "contexts/LeafletContentContext";
import {
  ExpandedInteractions,
  getCommentCount,
  getQuoteCount,
} from "./Interactions/Interactions";
import { PostContent } from "./PostContent";
import { PostHeader } from "./PostHeader/PostHeader";
import { AppBskyFeedDefs } from "@atproto/api";
import { useDrawerOpen } from "./Interactions/InteractionDrawer";
import { PageWrapper } from "components/Pages/Page";
import { decodeQuotePosition } from "./quotePosition";
import { PollData } from "./fetchPollData";
import { SharedPageProps } from "./PostPages";
import { PostPrevNextButtons } from "./PostPrevNextButtons";

import {
  collectFootnotesFromBlocks,
  buildFootnoteIndexMap,
  PublishedFootnoteSection,
} from "./Footnotes/PublishedFootnotes";
import { PublishedFootnoteSideColumn } from "./Footnotes/PublishedFootnoteSideColumn";
import { PublishedFootnotePopover } from "./Footnotes/PublishedFootnotePopover";
import { SubscribePanel } from "components/Subscribe/SubscribeButton";

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
  const { pages } = useLeafletContent();
  const footnotes = collectFootnotesFromBlocks(blocks);
  const footnoteIndexMap = buildFootnoteIndexMap(footnotes);

  if (!document) return null;

  const isSubpage = !!pageId;

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
        footnoteSideColumn={
          !props.hasContentToRight ? (
            <PublishedFootnoteSideColumn
              footnotes={footnotes}
              fullPageScroll={fullPageScroll}
            />
          ) : undefined
        }
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
          pages={pages as PubLeafletPagesLinearDocument.Main[]}
          pageId={pageId}
          bskyPostData={bskyPostData}
          blocks={blocks}
          did={did}
          prerenderedCodeBlocks={prerenderedCodeBlocks}
          footnoteIndexMap={footnoteIndexMap}
        />
        <PublishedFootnoteSection footnotes={footnotes} />
        <PostPrevNextButtons
          showPrevNext={preferences.showPrevNext !== false && !isSubpage}
        />
        <ExpandedInteractions
          pageId={pageId}
          showComments={preferences.showComments !== false}
          showMentions={preferences.showMentions !== false}
          showRecommends={preferences.showRecommends !== false}
          commentsCount={
            getCommentCount(document.comments_on_documents, pageId) || 0
          }
          quotesCount={getQuoteCount(document.quotesAndMentions, pageId) || 0}
          recommendsCount={document.recommendsCount}
        />
        <div className={`spacer h-4 w-full`} />
        {document.publication?.uri && (
          <SubscribePanel
            publicationUri={document.publication.uri}
            publicationUrl={props.pubRecord?.url}
            publicationName={props.pubRecord?.name ?? document.publication.name}
            publicationDescription={props.pubRecord?.description}
            newsletterMode={document.publication.newsletterMode}
          />
        )}

        {!hasPageBackground && <div className={`spacer h-8 w-full`} />}
      </PageWrapper>
      <PublishedFootnotePopover footnotes={footnotes} />
    </>
  );
}
