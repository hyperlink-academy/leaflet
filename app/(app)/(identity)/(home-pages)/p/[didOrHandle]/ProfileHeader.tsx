"use client";
import { Avatar } from "components/Avatar";
import { usePubTheme } from "components/ThemeManager/PublicationThemeProvider";
import { colorToString } from "components/ThemeManager/useColorAttribute";
import { PubIcon } from "components/ActionBar/Publications";
import { type NormalizedPublication } from "src/utils/normalizeRecords";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { AtUri } from "@atproto/syntax";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { SpeedyLink } from "components/SpeedyLink";
import { ReactNode } from "react";
import * as linkify from "linkifyjs";
import { BlueskyLinkTiny } from "components/Icons/BlueskyLinkTiny";

export const ProfileHeader = (props: {
  profile: ProfileViewDetailed;
  publications: { record: NormalizedPublication; uri: string }[];
  popover?: boolean;
}) => {
  let profileRecord = props.profile;
  const profileUrl = `https://leaflet.pub/p/${props.profile.handle}`;

  const avatarElement = (
    <Avatar
      src={profileRecord.avatar}
      displayName={profileRecord.displayName}
      className="profileAvatar shrink-0 "
      size="giant"
    />
  );

  const displayNameElement = (
    <h3 className="profileName  ">
      {profileRecord.displayName
        ? profileRecord.displayName
        : `@${props.profile.handle}`}
    </h3>
  );

  const handleElement = profileRecord.displayName && (
    <div className={`profileHandle text-secondary truncate text-sm`}>
      @{props.profile.handle}
    </div>
  );

  console.log("viewer: " + props.profile.viewer);

  console.log("did: " + props.profile.did);

  return (
    <div
      className={`profileHeader flex flex-col relative text-left`}
      style={{ wordBreak: "break-word" }}
      id="profile-header"
    >
      <div className="profileContent flex flex-col gap-3">
        <div
          className={`profileInfo flex flex-row gap-4 pt-4 items-center ${props.popover ? "px-4" : ""}`}
        >
          {props.popover ? (
            <SpeedyLink className={"hover:no-underline!"} href={profileUrl}>
              {avatarElement}
            </SpeedyLink>
          ) : (
            avatarElement
          )}
          <div className="flex flex-col gap-0.5 leading-snug grow">
            {props.popover ? (
              displayNameElement
            ) : (
              <div className="flex gap-2 justify-between items-start">
                {displayNameElement}
                <ProfileLinks handle={props.profile.handle || ""} />
              </div>
            )}

            {handleElement}
            <KnownFollowers
              viewer={props.profile.viewer}
              did={props.profile.did}
            />
          </div>
        </div>

        <pre
          className={`profileDescription pt-1 whitespace-pre-wrap text-secondary  ${props.popover ? "px-3 sm:px-4" : ""}`}
          style={{ fontFamily: "inherit" }}
        >
          {profileRecord.description
            ? parseDescription(profileRecord.description)
            : null}
        </pre>

        <div
          className={`profilePubCardContainer overflow-x-scroll ${props.popover ? "w-full" : "-mx-4 sm:-mx-6"}`}
        >
          <div
            className={`profilePubCards grid grid-flow-col pb-4 gap-2 w-fit ${props.popover ? "px-4 auto-cols-[164px]" : "px-4 sm:px-6 auto-cols-[164px] sm:auto-cols-[240px]"}`}
          >
            {props.publications.map((p) => (
              <PublicationCard key={p.uri} record={p.record} uri={p.uri} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileLinks = (props: { handle: string }) => {
  return (
    <div className="profileLinks shrink-0 text-lg h-[1lh] flex flex-row items-center gap-2">
      <a
        className="text-tertiary hover:text-accent-contrast hover:no-underline!"
        href={`https://bsky.app/profile/${props.handle}`}
      >
        <BlueskyLinkTiny />
      </a>
    </div>
  );
};
const PublicationCard = (props: {
  record: NormalizedPublication;
  uri: string;
}) => {
  const { record, uri } = props;
  const { bgLeaflet, bgPage, primary } = usePubTheme(record);

  return (
    <a
      href={record.url}
      className="profilePublicationCard border border-border p-2 rounded-lg hover:no-underline! text-primary basis-1/2"
      style={{ backgroundColor: `rgb(${colorToString(bgLeaflet, "rgb")})` }}
    >
      <div
        className="rounded-md p-2 flex flex-row gap-2"
        style={{
          backgroundColor: record.theme?.showPageBackground
            ? `rgb(${colorToString(bgPage, "rgb")})`
            : undefined,
        }}
      >
        <PubIcon
          icon={
            record.icon
              ? blobRefToSrc(record.icon.ref, new AtUri(uri).host)
              : undefined
          }
          pubName={record.name}
        />
        <h4
          className="truncate min-w-0"
          style={{
            color: `rgb(${colorToString(primary, "rgb")})`,
          }}
        >
          {record.name}
        </h4>
      </div>
    </a>
  );
};

function parseDescription(description: string): ReactNode[] {
  // Find all mentions using regex
  const mentionRegex = /@\S+/g;
  const mentions: { start: number; end: number; value: string }[] = [];
  let mentionMatch;
  while ((mentionMatch = mentionRegex.exec(description)) !== null) {
    mentions.push({
      start: mentionMatch.index,
      end: mentionMatch.index + mentionMatch[0].length,
      value: mentionMatch[0],
    });
  }

  // Find all URLs using linkifyjs
  const links = linkify.find(description).filter((link) => link.type === "url");

  // Filter out URLs that overlap with mentions (mentions take priority)
  const nonOverlappingLinks = links.filter((link) => {
    return !mentions.some(
      (mention) =>
        (link.start >= mention.start && link.start < mention.end) ||
        (link.end > mention.start && link.end <= mention.end) ||
        (link.start <= mention.start && link.end >= mention.end),
    );
  });

  // Combine into a single sorted list
  const allMatches: Array<{
    start: number;
    end: number;
    value: string;
    href: string;
    type: "url" | "mention";
  }> = [
    ...nonOverlappingLinks.map((link) => ({
      start: link.start,
      end: link.end,
      value: link.value,
      href: link.href,
      type: "url" as const,
    })),
    ...mentions.map((mention) => ({
      start: mention.start,
      end: mention.end,
      value: mention.value,
      href: `https://bsky.app/profile/${mention.value.slice(1)}`,
      type: "mention" as const,
    })),
  ].sort((a, b) => a.start - b.start);

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of allMatches) {
    // Add text before this match
    if (match.start > lastIndex) {
      parts.push(description.slice(lastIndex, match.start));
    }

    if (match.type === "mention") {
      parts.push(
        <a
          key={key++}
          href={match.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {match.value}
        </a>,
      );
    } else {
      // It's a URL
      const urlWithoutProtocol = match.value
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "");
      const displayText =
        urlWithoutProtocol.length > 50
          ? urlWithoutProtocol.slice(0, 50) + "…"
          : urlWithoutProtocol;
      parts.push(
        <a
          key={key++}
          href={match.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {displayText}
        </a>,
      );
    }

    lastIndex = match.end;
  }

  // Add remaining text after last match
  if (lastIndex < description.length) {
    parts.push(description.slice(lastIndex));
  }

  return parts;
}

const KnownFollowers = (props: {
  viewer: ProfileViewDetailed["viewer"];
  did: string;
}) => {
  let known = props.viewer?.knownFollowers;
  if (!known || known.count === 0) return null;
  let shown = known.followers.slice(0, 3);
  let others = known.count - shown.length;

  return (
    <a
      className="profileKnownFollowers w-fit flex items-center gap-1 text-xs text-tertiary italic hover:underline"
      href={`https://bsky.app/profile/${props.did}/known-followers`}
      target="_blank"
    >
      <span className="flex -space-x-1">
        {shown.map((f) => (
          <Avatar
            key={f.did}
            src={f.avatar}
            displayName={f.displayName || f.handle}
            size="tiny"
          />
        ))}
      </span>
      Followed by {known.count} friends
    </a>
  );
};
