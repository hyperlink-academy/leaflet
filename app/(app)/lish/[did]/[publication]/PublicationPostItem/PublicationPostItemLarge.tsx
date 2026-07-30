"use client";
import React from "react";
import { MembersBadge } from "./MembersBadge";
import { MetaRow } from "./MetaRow";
import { PostLink } from "./PostLink";
import { useFitToHeight } from "./useFitToHeight";
import { type LargeProps } from "./types";

export function PublicationPostItemLarge(props: LargeProps) {
  const hasCoverImage = !!props.coverImageSrc;
  const widePage = (props.pageWidth ?? 0) >= 768;
  const { boxRef, titleRef, descriptionRef } = useFitToHeight(
    props.title,
    props.description,
    hasCoverImage,
    widePage,
  );
  const px = props.inList
    ? widePage
      ? hasCoverImage
        ? "sm:pl-3"
        : "pr-0"
      : "px-0"
    : "px-3";

  return (
    <div
      className={`postLinkLarge relative flex flex-col w-full items-stretch ${widePage ? "sm:flex-row sm:max-h-[254px]" : ""} `}
    >
      <PostLink href={props.href} />

      {hasCoverImage && (
        <img
          src={props.coverImageSrc}
          alt={props.coverImageAlt || props.title || ""}
          className={`object-cover rounded-none! border-b border-border-light ${widePage ? "sm:h-[254px] aspect-[3/2] sm:border-transparent " : "h-full aspect-[1.91/1]"}  `}
        />
      )}

      <div
        className={`relative flex flex-col pt-2 ${widePage ? "sm:py-2 sm:px-4 " : ""} ${!props.inList && "px-3 py-2"}`}
      >
        {props.pubInfo}
        {props.membersOnly && <MembersBadge />}

        <div
          ref={boxRef}
          className="postTitleAndContent flex flex-col gap-1 grow min-h-0 overflow-clip"
        >
          {props.title && (
            <h3
              ref={titleRef as React.RefObject<HTMLHeadingElement>}
              className={`text-primary leading-snug text-lg  line-clamp-2 ${widePage ? "sm:text-xl " : ""}`}
            >
              {props.title}
            </h3>
          )}
          <p
            ref={descriptionRef}
            className={`text-secondary line-clamp-3 text-base mb-1 ${widePage ? "sm:text-lg " : ""}`}
          >
            {props.description}
          </p>
        </div>
        <div className="spacer h-2 w-full" />
        <MetaRow
          compact={widePage}
          author={props.author}
          date={props.date}
          interactions={props.interactions}
        />
      </div>
    </div>
  );
}
