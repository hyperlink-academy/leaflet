"use client";

import { useContext, useState } from "react";
import { CommentTiny } from "../Icons/CommentTiny";
import { CommentEmptyTiny } from "../Icons/CommentEmptyTiny";

import { CommentFilledSmall } from "../Icons/CommentFilledSmall";
import { CommentEmptySmall } from "../Icons/CommentEmptySmall";
import { DiscussionModal } from "./DiscussionModal";
import { DrawerThreadContext } from "app/(app)/lish/[did]/[publication]/[rkey]/Interactions/drawerThreadContext";
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
  // Lets the caller track when the discussion is open — the reader feed uses
  // this to keep the post listing highlighted while the modal is up.
  onOpenChange?: (open: boolean) => void;
}) {
  // Inside a published post body a DrawerThreadContext is in scope; there we open
  // this post's discussion in the interaction drawer (like a Bluesky post's
  // thread) instead of the standalone modal used in listings/feeds.
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
        onMouseEnter={props.onPrefetch}
        onTouchStart={props.onPrefetch}
        ariaLabel="Post discussions"
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
