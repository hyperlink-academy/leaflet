import React from "react";
import { MetaRow } from "./MetaRow";
import { PostLink } from "./PostLink";
import { type LargeProps } from "./types";

export function PublicationPostItemLarge(props: LargeProps) {
  const hasCoverImage = !!props.coverImageSrc;
  const widePage = (props.pageWidth ?? 0) >= 768;
  const px = props.inList
    ? widePage
      ? hasCoverImage
        ? "sm:pl-3"
        : "pr-0"
      : "px-0"
    : "px-3";

  return (
    <div
      className={`postLinkLarge relative flex flex-col w-full items-stretch ${widePage ? "sm:flex-row" : ""} `}
    >
      <PostLink href={props.href} />

      {hasCoverImage && (
        <img
          src={props.coverImageSrc}
          alt={props.coverImageAlt || props.title || ""}
          className={`${widePage ? "sm:h-[254px] aspect-[3/2]" : "h-full aspect-[1.91/1]"}  object-cover rounded-none!`}
        />
      )}

      <div
        className={`flex flex-col pt-2 ${widePage ? "sm:py-2 sm:px-4 " : ""} ${!props.inList && "px-3 py-2"}`}
      >
        {props.pubInfo}
        {props.title && (
          <h3
            className={`text-primary leading-snug text-lg pb-1  clamp-2 ${widePage ? "sm:text-xl " : ""}`}
          >
            {props.title}
          </h3>
        )}
        <p
          className={`text-secondary line-clamp-3 text-base mb-1 ${widePage ? "sm:text-lg " : ""}`}
        >
          {props.description}
        </p>
        <MetaRow
          author={props.author}
          date={props.date}
          interactions={props.interactions}
          layout="compact"
          textClassName={`${widePage ? "text-sm sm:text-base justify-between! grow! " : "text-sm "} `}
        />
      </div>
    </div>
  );
}
