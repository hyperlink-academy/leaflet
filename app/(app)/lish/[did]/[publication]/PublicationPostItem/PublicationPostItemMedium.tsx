import React from "react";
import { MetaRow } from "./MetaRow";
import { PostLink } from "./PostLink";
import { type MediumProps } from "./types";

export function PublicationPostItemMedium(props: MediumProps) {
  const hasCoverImage = !!props.coverImageSrc;

  return (
    <div className="postLinkMedium relative flex w-full flex-col">
      <PostLink href={props.href} />

      <div className="flex w-full items-stretch ">
        <div
          className={`flex w-full grow flex-col justify-between min-w-0 pt-2  ${props.inList ? "" : "px-3 pt-2"} ${props.inList && !hasCoverImage ? "pr-0" : "pr-3"}`}
        >
          {props.pubInfo && props.pubInfo}
          {props.title && (
            <h3 className="text-primary leading-snug line-clamp-2 pb-1">
              {props.title}
            </h3>
          )}
          <div className="grow">
            <p className={`text-secondary h-fit max-h-[72px] line-clamp-3`}>
              {props.description}
            </p>
          </div>
          <MetaRow
            author={props.author}
            date={props.date}
            interactions={props.interactions}
            textClassName="text-sm hidden sm:flex mt-1 pb-2"
            layout="auto"
          />
        </div>
        {hasCoverImage && (
          <div
            className={`self-start shrink-0 w-24  sm:w-48 sm:p-0 pt-2 ${!props.inList ? "border-l sm:border-border-light border-transparent " : ""}  ${props.pubInfo && "sm:mt-0 mt-[21px] sm:mr-0 mr-3"}`}
          >
            <img
              src={props.coverImageSrc}
              alt={props.coverImageAlt || props.title || ""}
              className="w-full h-full aspect-square object-cover"
            />
          </div>
        )}
      </div>
      <MetaRow
        author={props.author}
        date={props.date}
        interactions={props.interactions}
        textClassName={`text-sm shrink-0 sm:hidden   ${props.inList ? "px-0" : "px-3 pb-2 mt-1"} `}
        layout="compact"
      />
    </div>
  );
}
