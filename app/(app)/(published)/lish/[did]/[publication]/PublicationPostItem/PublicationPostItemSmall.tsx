import React from "react";
import { MembersBadge } from "./MembersBadge";
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
        // h2 slots under the pub-name h1 in the outline; text-[1.125em] pins
        // the h3-scale size the base-layer heading rules would otherwise bump.
        <h2 className="text-primary leading-snug text-[1.125em]">
          {props.title}
          {props.membersOnly && <MembersBadge />}
        </h2>
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
