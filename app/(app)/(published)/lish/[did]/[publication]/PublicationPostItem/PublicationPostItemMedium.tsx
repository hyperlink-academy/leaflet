"use client";
import React from "react";
import { MembersBadge } from "./MembersBadge";
import { MetaRow } from "./MetaRow";
import { PostLink } from "./PostLink";
import { useFitToHeight } from "./useFitToHeight";
import { type MediumProps } from "./types";

export function PublicationPostItemMedium(props: MediumProps) {
  const hasCoverImage = !!props.coverImageSrc;
  const { boxRef, titleRef, descriptionRef } = useFitToHeight(
    props.title,
    props.description,
    hasCoverImage,
  );

  return (
    <div className="postItemMedium relative flex w-full flex-col">
      <PostLink href={props.href} title={props.title} />

      <div className="postItemContent flex w-full items-stretch sm:max-h-36">
        <div
          className={`postItemInfo flex w-full grow flex-col justify-between min-w-0 py-2  ${props.inList ? "" : "px-3 py-2"} ${props.inList && !hasCoverImage ? "pr-0" : "pr-3"}`}
        >
          {props.pubInfo && props.pubInfo}
          {props.membersOnly && (
            <MembersBadge
              publicationUri={props.publicationUri}
              gatePolicy={props.gatePolicy}
            />
          )}

          {/* Budget for title + description: the cover image's height
                (w-24 / sm:w-48, square). useFitToHeight measures against it and
                hands the title the lines it needs, the description the rest. */}

          <div
            ref={boxRef}
            className="postTitleAndDescription flex flex-col overflow-hidden grow min-h-0 "
          >
            {props.title && (
              // h2 slots under the pub-name h1 in the outline; text-[1.125em]
              // pins the h3-scale size the base-layer heading rules would
              // otherwise bump.
              <h2
                ref={titleRef as React.RefObject<HTMLHeadingElement>}
                className="postTitle text-primary leading-snug line-clamp-2 text-[1.125em]"
              >
                {props.title}
              </h2>
            )}
            {/*the descriptionRef here is connected to useFitToHeight and is controlled the line clamp if theres not enough space for three lines*/}
            <p
              ref={descriptionRef}
              className="postDescription text-secondary line-clamp-3 mt-1"
            >
              {props.description}
            </p>
          </div>

          <div className="spacer sm:h-2 h-1 w-full" />
          <MetaRow
            author={props.author}
            date={props.date}
            interactions={props.interactions}
            textClassName="text-sm sm:flex"
          />
        </div>
        {hasCoverImage && (
          <div
            className={`self-start shrink-0 w-24  sm:w-36  ${!props.inList ? "border-l sm:border-border-light border-transparent sm:p-0 pt-2" : "p-2"}  ${props.pubInfo && "sm:mt-0 mt-[21px] sm:mr-0 mr-3"}`}
          >
            <img
              src={props.coverImageSrc}
              alt={props.coverImageAlt || props.title || ""}
              className={`w-full h-full aspect-square object-cover rounded-md ${!props.inList && "sm:rounded-none"}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
