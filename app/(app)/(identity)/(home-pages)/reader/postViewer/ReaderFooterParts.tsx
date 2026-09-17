"use client";
import type { ReaderFooterVariantProps } from "./ReaderFooter";
import { RecommendButton } from "components/Interactions/RecommendButton";
import { DiscussionButton } from "components/Interactions/DiscussionButton";
import { TagButton } from "components/Interactions/TagButton";
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
    | "panel"
    | "setPanel"
  > & { className?: string },
) => {
  let { post, postRecord, postUrl, pubRecord, interactions, panel, setPanel } =
    props;
  // Clicking the control for the panel that's already up closes it.
  let togglePanel = (next: "discussion" | "recommends") =>
    setPanel(panel?.type === next ? null : { type: next });

  if (!post || !post.publication || !pubRecord) return;
  return (
    <div
      className={`postInfo min-w-0 flex flex-row sm:justify-end justify-between gap-4 items-center grow ${props.className ?? ""}`}
    >
      <div className="postInteractions flex sm:gap-2 items-center">
        {postRecord && postUrl && interactions ? (
          <>
            <RecommendButton
              documentUri={post.documents.uri}
              recommendsCount={interactions.recommendsCount}
              onOpenRecommends={() => togglePanel("recommends")}
              className="text-sm text-tertiary sm:pr-0 pr-2"
            />
            <DiscussionButton
              showWhenEmpty
              documentUri={post.documents.uri}
              commentsCount={interactions.commentsCount}
              quotesCount={interactions.quotesCount}
              showComments={interactions.showComments}
              showMentions={interactions.showMentions}
              postUrl={postUrl}
              title={postRecord.title}
              onClick={() => togglePanel("discussion")}
              className="text-sm text-tertiary px-2 sm:px-0"
            />
            <TagButton
              tags={postRecord.tags ?? []}
              publicationUri={post.publication.uri}
              showOtherPublications={
                pubRecord.preferences?.showOtherPublicationsInTags !== false
              }
              onTagClick={(tag) => setPanel({ type: "tag", tag })}
              className="text-sm text-tertiary px-2 sm:px-0"
            />
            <InteractionShareButton
              postRecord={postRecord}
              postUrl={postUrl}
              documentUri={post.documents.uri}
              publication={pubRecord}
              pubUri={post.publication?.uri}
              className="text-tertiary sm:pl-0 pl-2"
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
      <SubscribeButton
        publicationUri={post.publication.uri}
        publicationUrl={pubRecord.url}
        publicationName={pubRecord.name || ""}
        publicationDescription={pubRecord.description}
        newsletterMode={props.newsletterMode}
      />
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
