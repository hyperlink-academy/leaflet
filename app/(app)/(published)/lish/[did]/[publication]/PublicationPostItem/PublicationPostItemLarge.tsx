"use client";
import React from "react";
import { MembersBadge } from "./MembersBadge";
import { MetaRow } from "./MetaRow";
import { PostItemCoverImage } from "./PostItemCoverImage";
import { PostLink } from "./PostLink";
import { useFitToHeight } from "./useFitToHeight";
import { type LargeProps } from "./types";
import { useViewerSubscription } from "components/Subscribe/viewerSubscription";
import { membershipUnlocksGatedPost } from "src/membership";

export function PublicationPostItemLarge(props: LargeProps) {
  const hasCoverImage = !!props.coverImageSrc;
  const widePage = (props.pageWidth ?? 0) >= 768;
  const { membership } = useViewerSubscription(props.publicationUri);
  const locked =
    !!props.membersOnly &&
    !membershipUnlocksGatedPost(membership, props.gatePolicy);
  const { boxRef, titleRef, descriptionRef } = useFitToHeight(
    props.title,
    props.description,
    hasCoverImage,
    widePage,
  );

  return (
    <div
      className={`postLinkLarge relative flex flex-col w-full items-stretch ${widePage ? "sm:flex-row sm:max-h-[254px]" : ""} `}
    >
      <PostLink href={props.href} title={props.title} onClick={props.onClick} />

      {hasCoverImage && (
        <PostItemCoverImage
          src={props.coverImageSrc!}
          alt={props.coverImageAlt || props.title || ""}
          locked={locked}
          className={`shrink-0 ${props.inList ? "rounded-md" : " border-b border-border-light rounded-none!"} ${widePage ? "sm:h-[254px] aspect-[3/2] sm:border-transparent " : "w-full h-auto aspect-[1.91/1]"}  `}
        />
      )}

      <div
        className={`relative flex flex-col grow pt-2 ${hasCoverImage ? "" : ""}  ${props.inList ? (hasCoverImage && widePage ? "sm:py-2 sm:px-4" : "px-0 py-2") : "px-3 py-2"}`}
      >
        {props.pubInfo}
        {props.membersOnly && (
          <MembersBadge
            publicationUri={props.publicationUri}
            gatePolicy={props.gatePolicy}
          />
        )}

        <div
          ref={boxRef}
          className="postTitleAndContent flex flex-col gap-1 grow min-h-0 overflow-clip"
        >
          {props.title && (
            <h2
              ref={titleRef as React.RefObject<HTMLHeadingElement>}
              className={`text-primary leading-snug text-lg  line-clamp-2 ${widePage ? "sm:text-xl " : "text-[1.125em]"}`}
            >
              {props.title}
            </h2>
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
