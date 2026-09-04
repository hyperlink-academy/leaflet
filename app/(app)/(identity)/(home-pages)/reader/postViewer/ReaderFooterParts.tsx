"use client";
import type { ReaderFooterVariantProps } from "./ReaderFooter";
import { RecommendButton } from "components/Interactions/RecommendButton";
import { DiscussionButton } from "components/Interactions/DiscussionButton";
import { InteractionShareButton } from "components/Interactions/InteractionShareButton";
import { SubscribeButton } from "components/Subscribe/SubscribeButton";
import { Separator } from "components/Layout";
import { RecommendEmptyTiny } from "components/Icons/RecommendTiny";
import { CommentEmptyTiny } from "components/Icons/CommentEmptyTiny";
import { ShareTiny } from "components/Icons/ShareTiny";
import { GoToArrowSmall } from "components/Icons/GoToArrowSmall";
import { GoToArrowLined } from "components/Icons/GoToArrowLined";
import { PubIcon } from "components/ActionBar/Publications";
import { GoToArrow } from "components/Icons/GoToArrow";
export const ReaderFooterPostInfo = (
  props: Pick<
    ReaderFooterVariantProps,
    | "post"
    | "postRecord"
    | "postUrl"
    | "pubRecord"
    | "pubIcon"
    | "newsletterMode"
    | "interactions"
    | "discussionOpen"
    | "setDiscussionOpen"
  > & { className?: string },
) => {
  let { post, postRecord, postUrl, pubRecord, interactions } = props;
  return (
    <div
      className={`postInfo min-w-0 flex justify-between gap-3 items-center grow ${props.className ?? ""}`}
    >
      <div className="flex gap-2 grow min-w-0 items-center">
        <PubIcon icon={props.pubIcon} pubName={pubRecord?.name} tiny />
        <div className="text-tertiary text-sm min-w-0 truncate">
          {postRecord?.title}
        </div>
      </div>
      <div className="postInteractions flex gap-2 items-center">
        {post && postRecord && postUrl && interactions ? (
          <>
            <RecommendButton
              documentUri={post.documents.uri}
              recommendsCount={interactions.recommendsCount}
              className="text-sm text-tertiary"
            />
            <DiscussionButton
              documentUri={post.documents.uri}
              commentsCount={interactions.commentsCount}
              quotesCount={interactions.quotesCount}
              showComments={interactions.showComments}
              showMentions={interactions.showMentions}
              postUrl={postUrl}
              title={postRecord.title}
              onClick={() => props.setDiscussionOpen(!props.discussionOpen)}
              className="text-sm text-tertiary"
            />
            <InteractionShareButton
              postRecord={postRecord}
              postUrl={postUrl}
              documentUri={post.documents.uri}
              publication={pubRecord}
              pubUri={post.publication?.uri}
              className="text-tertiary"
            />
          </>
        ) : (
          <div aria-hidden className="flex gap-3 items-center text-border">
            <RecommendEmptyTiny />
            <CommentEmptyTiny />
            <ShareTiny />
          </div>
        )}
      </div>
      {/*{post?.publication && pubRecord && (
        <>
          <Separator classname="h-5!" />
          <SubscribeButton
            publicationUri={post.publication.uri}
            publicationUrl={pubRecord.url}
            publicationName={pubRecord.name || ""}
            publicationDescription={pubRecord.description}
            newsletterMode={props.newsletterMode}
          />
        </>
      )}*/}
    </div>
  );
};

export const ReaderFooterCloseButton = (
  props: Pick<ReaderFooterVariantProps, "readerPageName" | "closeViewer">,
) => {
  return (
    <button
      aria-label={`Back to ${props.readerPageName}`}
      className="readerCloseFrameButton flex items-center gap-2 text-tertiary hover:text-accent-contrast font-bold text-base"
      onClick={props.closeViewer}
    >
      <GoToArrowLined className="rotate-180 shrink-0" />
      {props.readerPageName}
    </button>
  );
};

export const ReaderFooterNav = (
  props: Pick<
    ReaderFooterVariantProps,
    "hasPrev" | "hasNext" | "prevPost" | "nextPost"
  >,
) => {
  return (
    <div className="readerActions flex gap-3">
      <button
        aria-label="Previous post"
        disabled={!props.hasPrev}
        onClick={props.prevPost}
      >
        <GoToArrowSmall
          className={` rotate-180 ${props.hasPrev ? "text-secondary hover:text-accent-contrast" : "text-border"}`}
        />
      </button>
      <button
        aria-label="Next post"
        disabled={!props.hasNext}
        onClick={props.nextPost}
      >
        <GoToArrowSmall
          className={`${props.hasNext ? "text-secondary hover:text-accent-contrast" : "text-border"}`}
        />
      </button>
    </div>
  );
};
