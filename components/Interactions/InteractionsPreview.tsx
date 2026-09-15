"use client";
import { useContext, useState } from "react";
import { Tag } from "../Tags";
import { Popover } from "../Popover";
import { DrawerThreadContext } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Interactions/drawerThreadContext";
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
}) => {
  return (
    <div
      className={` text-tertiary text-sm items-center flex gap-4 shrink-0`}
    >
      {props.showRecommends === false ? null : (
        <RecommendButton
          documentUri={props.documentUri}
          recommendsCount={props.recommendsCount}
        />
      )}
      <DiscussionButton
        documentUri={props.documentUri}
        commentsCount={props.commentsCount}
        quotesCount={props.quotesCount}
        showComments={props.showComments}
        showMentions={props.showMentions}
        postUrl={props.postUrl}
        title={props.postRecord.title}
      />
      <InteractionShareButton
        postRecord={props.postRecord}
        postUrl={props.postUrl}
        documentUri={props.documentUri}
        publication={props.publication}
        pubUri={props.pubUri}
      />
    </div>
  );
};

// When a drawer-aware provider is in scope (the published post header) a tag
// opens the drawer's tag view instead of linking out to the tag page.
export const TagPopover = (props: { tags: string[] }) => {
  const drawerNav = useContext(DrawerThreadContext);
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
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
      <TagList
        tags={props.tags}
        className="text-secondary!"
        onTagClick={
          drawerNav &&
          ((tag) => {
            setOpen(false);
            drawerNav.push({ type: "tag", tag });
          })
        }
      />
    </Popover>
  );
};

const TagList = (props: {
  tags: string[];
  className?: string;
  onTagClick?: ((tag: string) => void) | null;
}) => {
  return (
    <div className="flex gap-1 flex-wrap" role="list" aria-label="Tags">
      {props.tags.map((tag, index) => (
        <Tag
          name={tag}
          key={index}
          className={props.className}
          onClick={props.onTagClick ?? undefined}
        />
      ))}
    </div>
  );
};
