"use client";
import { Tag } from "../Tags";
import { Popover } from "../Popover";
import { TagTiny } from "../Icons/TagTiny";
import { RecommendButton } from "./RecommendButton";
import { DiscussionButton } from "./DiscussionButton";
import { InteractionShareButton } from "./InteractionShareButton";
import {
  NormalizedDocument,
  NormalizedPublication,
} from "lexicons/src/normalize";

export const InteractionPreview = (props: {
  quotesCount: number;
  commentsCount: number;
  recommendsCount: number;
  documentUri: string;
  tags?: string[];
  postUrl: string;
  postRecord: NormalizedDocument;
  publication?: NormalizedPublication;
  pubUri: string | undefined;
  showComments: boolean;
  showMentions: boolean;
  showRecommends: boolean;
  shareType: "none" | "weak" | "strong";
}) => {
  return (
    <div
      className={` text-tertiary text-sm  items-end flex gap-4 grow min-w-0 justify-between`}
    >
      <div className="flex gap-2 items-center">
        <DiscussionButton
          documentUri={props.documentUri}
          commentsCount={props.commentsCount}
          quotesCount={props.quotesCount}
          showComments={props.showComments}
          showMentions={props.showMentions}
          postUrl={props.postUrl}
          title={props.postRecord.title}
        />
        {props.showRecommends === false ? null : (
          <RecommendButton
            documentUri={props.documentUri}
            recommendsCount={props.recommendsCount}
          />
        )}
      </div>

      <InteractionShareButton
        postRecord={props.postRecord}
        type={props.shareType}
        postUrl={props.postUrl}
        documentUri={props.documentUri}
        publication={props.publication}
        pubUri={props.pubUri}
      />
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
