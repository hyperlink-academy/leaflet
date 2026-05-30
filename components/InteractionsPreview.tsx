"use client";
import { useState } from "react";
import { Separator } from "./Layout";
import { CommentTiny } from "./Icons/CommentTiny";
import { useSmoker } from "./Toast";
import { Tag } from "./Tags";
import { Popover } from "./Popover";
import { TagTiny } from "./Icons/TagTiny";
import { RecommendButton } from "./RecommendButton";
import { DiscussionModal } from "./DiscussionModal";

export const InteractionPreview = (props: {
  quotesCount: number;
  commentsCount: number;
  recommendsCount: number;
  documentUri: string;
  tags?: string[];
  postUrl: string;
  title?: string;
  showComments: boolean;
  showMentions: boolean;
  showRecommends: boolean;

  share?: boolean;
}) => {
  let smoker = useSmoker();
  let [discussionsOpen, setDiscussionsOpen] = useState(false);
  let commentsAvailable = props.showComments !== false && props.commentsCount > 0;
  let mentionsAvailable = props.showMentions && props.quotesCount > 0;
  let discussionsAvailable = commentsAvailable || mentionsAvailable;
  let interactionsAvailable =
    discussionsAvailable ||
    (props.showRecommends !== false && props.recommendsCount > 0);

  const tagsCount = props.tags?.length || 0;

  return (
    <div className={`flex gap-2 text-tertiary text-sm  items-center`}>
      {props.showRecommends === false ? null : (
        <RecommendButton
          documentUri={props.documentUri}
          recommendsCount={props.recommendsCount}
        />
      )}

      {!discussionsAvailable ? null : (
        <button
          aria-label="Post discussions"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDiscussionsOpen(true);
          }}
          className="relative flex flex-row gap-1 text-sm items-center hover:text-accent-contrast text-tertiary"
        >
          <CommentTiny /> {props.commentsCount + props.quotesCount}
        </button>
      )}
      {discussionsAvailable && (
        <DiscussionModal
          open={discussionsOpen}
          onOpenChange={setDiscussionsOpen}
          document_uri={props.documentUri}
          postUrl={props.postUrl}
          title={props.title}
          commentsCount={props.commentsCount}
          quotesCount={props.quotesCount}
          showComments={props.showComments}
          showMentions={props.showMentions}
        />
      )}
      {tagsCount === 0 ? null : (
        <>
          {interactionsAvailable ? <Separator classname="h-4!" /> : null}
          <TagPopover tags={props.tags!} />
        </>
      )}
      {props.share && (
        <>
          <Separator classname="h-4!" />

          <button
            id={`copy-post-link-${props.postUrl}`}
            className="flex gap-1 items-center hover:text-accent-contrast relative"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              let mouseX = e.clientX;
              let mouseY = e.clientY;

              if (!props.postUrl) return;
              navigator.clipboard.writeText(props.postUrl);

              smoker({
                text: <strong>Copied Link!</strong>,
                position: {
                  y: mouseY,
                  x: mouseX,
                },
              });
            }}
          >
            Share
          </button>
        </>
      )}
    </div>
  );
};

export const TagPopover = (props: { tags: string[] }) => {
  return (
    <Popover
      className="p-2! max-w-xs"
      trigger={
        <div
          className="relative flex gap-1 items-center hover:text-accent-contrast"
          aria-label={`${props.tags.length} tag${props.tags.length === 1 ? "" : "s"}`}
        >
          <TagTiny aria-hidden /> {props.tags.length}
        </div>
      }
    >
      <TagList tags={props.tags} className="text-secondary!" />
    </Popover>
  );
};

const TagList = (props: { tags: string[]; className?: string }) => {
  return (
    <div className="flex gap-1 flex-wrap" role="list" aria-label="Tags">
      {props.tags.map((tag, index) => (
        <Tag name={tag} key={index} className={props.className} />
      ))}
    </div>
  );
};
