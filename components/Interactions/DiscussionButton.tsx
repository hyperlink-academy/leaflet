"use client";

import { useContext, useState } from "react";
import { CommentTiny } from "../Icons/CommentTiny";
import { CommentEmptyTiny } from "../Icons/CommentEmptyTiny";

import { CommentFilledSmall } from "../Icons/CommentFilledSmall";
import { CommentEmptySmall } from "../Icons/CommentEmptySmall";
import { DiscussionModal } from "./DiscussionModal";
import { prefetchDocumentDiscussion } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Interactions/useDocumentDiscussionData";
import { DrawerThreadContext } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Interactions/drawerThreadContext";
import {
  InteractionButton,
  LargeInteractionButton,
} from "./InteractionButtons";

export function DiscussionButton(props: {
  documentUri: string;
  commentsCount: number;
  quotesCount: number;
  showComments: boolean;
  showMentions: boolean;
  postUrl: string;
  title?: string;
  pageId?: string;
  large?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onPrefetch?: () => void;
  showWhenEmpty?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const drawerNav = useContext(DrawerThreadContext);
  const [discussionsOpen, setDiscussionsOpen] = useState(false);
  const commentsAvailable =
    props.showComments && (props.showWhenEmpty || props.commentsCount > 0);
  const mentionsAvailable = props.showMentions && props.quotesCount > 0;
  const discussionsAvailable = commentsAvailable || mentionsAvailable;

  if (!discussionsAvailable) return null;

  const openDiscussions = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (props.onClick) {
      props.onClick(e);
    } else if (drawerNav) {
      drawerNav.push({ type: "standardSitePost", uri: props.documentUri });
    } else {
      props.onOpenChange?.(true);
      setDiscussionsOpen(true);
    }
  };

  // The post page's own drawer reads its discussion off the page, so it
  // passes its own prefetch; everywhere else the modal, drawer view and reader
  // pane all load through useDocumentDiscussionData.
  const prefetch =
    props.onPrefetch ?? (() => prefetchDocumentDiscussion(props.documentUri));

  const ButtonWrapper = props.large
    ? LargeInteractionButton
    : InteractionButton;
  const total = props.commentsCount + props.quotesCount;
  const icon =
    total > 0 ? (
      props.large ? (
        <CommentFilledSmall aria-hidden />
      ) : (
        <CommentTiny aria-hidden />
      )
    ) : props.large ? (
      <CommentEmptySmall aria-hidden />
    ) : (
      <CommentEmptyTiny aria-hidden />
    );

  return (
    <>
      <ButtonWrapper
        onClick={openDiscussions}
        onMouseEnter={prefetch}
        onTouchStart={prefetch}
        ariaLabel="Post discussions"
        className={`${props.large ? "" : "hover:text-accent-contrast"} ${props.className ?? ""}`}
      >
        {icon}
        {total > 0 ? ` ${total}` : null}
      </ButtonWrapper>
      {!props.onClick && !drawerNav && (
        <DiscussionModal
          open={discussionsOpen}
          onOpenChange={(open) => {
            setDiscussionsOpen(open);
            props.onOpenChange?.(open);
          }}
          document_uri={props.documentUri}
          postUrl={props.postUrl}
          title={props.title}
          commentsCount={props.commentsCount}
          quotesCount={props.quotesCount}
          showComments={props.showComments}
          showMentions={props.showMentions}
          pageId={props.pageId}
        />
      )}
    </>
  );
}
