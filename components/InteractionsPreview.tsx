"use client";
import { Separator } from "./Layout";
import { CommentTiny } from "./Icons/CommentTiny";
import { QuoteTiny } from "./Icons/QuoteTiny";
import { useSmoker } from "./Toast";
import { Tag } from "./Tags";
import { Popover } from "./Popover";
import { TagTiny } from "./Icons/TagTiny";
import { SpeedyLink } from "./SpeedyLink";

export const InteractionPreview = (props: {
  quotesCount: number;
  commentsCount: number;
  tagsCount: number;
  postUrl: string;
  showComments: boolean | undefined;
  share?: boolean;
}) => {
  let smoker = useSmoker();
  let interactionsAvailable =
    props.quotesCount > 0 ||
    (props.showComments !== false && props.commentsCount > 0);

  return (
    <div
      className={`flex gap-2 text-tertiary text-sm  items-center self-start`}
    >
      {props.tagsCount === 0 ? null : (
        <>
          <TagPopover tagsCount={props.tagsCount} />
          {interactionsAvailable || props.share ? (
            <Separator classname="h-4" />
          ) : null}
        </>
      )}

      {props.quotesCount === 0 ? null : (
        <SpeedyLink
          aria-label="Post quotes"
          href={`${props.postUrl}?interactionDrawer=quotes`}
          className="flex flex-row gap-1 text-sm text-tertiary items-center"
        >
          <QuoteTiny /> {props.quotesCount}
        </SpeedyLink>
      )}
      {props.showComments === false || props.commentsCount === 0 ? null : (
        <SpeedyLink
          aria-label="Post comments"
          href={`${props.postUrl}?interactionDrawer=comments`}
          className="flex flex-row gap-1 text-sm text-tertiary items-center"
        >
          <CommentTiny /> {props.commentsCount}
        </SpeedyLink>
      )}
      {interactionsAvailable && props.share ? (
        <Separator classname="h-4 !min-h-0" />
      ) : null}
      {props.share && (
        <>
          <button
            id={`copy-post-link-${props.postUrl}`}
            className="flex gap-1 items-center hover:font-bold relative"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              let mouseX = e.clientX;
              let mouseY = e.clientY;

              if (!props.postUrl) return;
              navigator.clipboard.writeText(`leaflet.pub${props.postUrl}`);

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

const TagPopover = (props: { tagsCount: number }) => {
  return (
    <Popover
      className="p-2! max-w-xs"
      asChild
      trigger={
        <button
          aria-label="Post tags"
          className="relative flex gap-1 items-center "
        >
          <TagTiny /> {props.tagsCount}
        </button>
      }
    >
      <TagList className="text-secondary!" />
    </Popover>
  );
};

const TagList = (props: { className?: string }) => {
  return (
    <div className="flex gap-1 flex-wrap">
      {Tags.map((tag, index) => (
        <Tag
          name={tag}
          key={index}
          onClick={() => {}}
          className={props.className}
        />
      ))}
    </div>
  );
};

const Tags = [
  "Hello",
  "these are",
  "some tags",
  "and I'm gonna",
  "make",
  "them super",
  "long",
];
