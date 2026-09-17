"use client";
import { useState } from "react";
import { Popover } from "../Popover";
import { Tag } from "../Tags";
import { TagTiny } from "../Icons/TagTiny";
import { prefetchTagPosts, type TagPostsSource } from "./tagPosts";

export function TagButton(props: {
  tags: string[];
  publicationUri?: string;
  showOtherPublications: boolean;
  onTagClick: (tag: string) => void;
  className?: string;
}) {
  let [open, setOpen] = useState(false);
  if (props.tags.length === 0) return null;

  let source = (tag: string): TagPostsSource => ({
    tag,
    publicationUri: props.publicationUri,
    showOtherPublications: props.showOtherPublications,
  });
  // Server actions run one at a time per client, so warming every tag from the
  // icon would queue the clicked tag's fetch behind the others. The icon only
  // prefetches when there's a single tag to guess; otherwise the chips do it.
  let prefetchOnlyTag =
    props.tags.length === 1
      ? () => prefetchTagPosts(source(props.tags[0]))
      : undefined;

  return (
    <Popover
      asChild
      open={open}
      onOpenChange={setOpen}
      className="max-w-xs"
      trigger={
        <button
          aria-label="Post tags"
          className={`tagButton relative flex gap-1 items-center hover:text-accent-contrast ${props.className ?? ""}`}
          onMouseEnter={prefetchOnlyTag}
          onPointerDown={prefetchOnlyTag}
        >
          <TagTiny aria-hidden />
          {props.tags.length}
        </button>
      }
    >
      <div className="flex gap-1 flex-wrap py-1" role="list" aria-label="Tags">
        {props.tags.map((tag) => (
          <Tag
            key={tag}
            name={tag}
            onPrefetch={(t) => prefetchTagPosts(source(t))}
            onClick={(t) => {
              setOpen(false);
              props.onTagClick(t);
            }}
          />
        ))}
      </div>
    </Popover>
  );
}
