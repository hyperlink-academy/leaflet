import React from "react";
import { MetaRow } from "./MetaRow";
import { PostLink } from "./PostLink";
import { type CommonProps } from "./types";

export function PublicationPostItemSmall(props: CommonProps) {
  return (
    <div
      className={`postLinkSmall relative flex w-full grow flex-col py-2 ${props.inList ? "px-0" : "px-3"}`}
    >
      <PostLink href={props.href} />
      {props.pubInfo}
      {props.title && (
        <h3 className="text-primary leading-snug pb-1">{props.title}</h3>
      )}
      <MetaRow
        author={props.author}
        date={props.date}
        interactions={props.interactions}
        textClassName="text-sm"
      />
    </div>
  );
}
