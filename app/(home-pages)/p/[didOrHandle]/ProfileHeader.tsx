"use client";
import { Avatar } from "components/Avatar";
import { usePubTheme } from "components/ThemeManager/PublicationThemeProvider";
import { colorToString } from "components/ThemeManager/useColorAttribute";
import { PubIcon } from "components/ActionBar/Publications";
import { type NormalizedPublication } from "src/utils/normalizeRecords";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { SpeedyLink } from "components/SpeedyLink";
import { ReactNode } from "react";
import * as linkify from "linkifyjs";

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
      className="profileAvatar mx-auto mt-3 sm:mt-4"
      giant
    />
  );

  const displayNameElement = (
    <h3 className="profileName px-3 sm:px-4 pt-2 leading-tight">
      {profileRecord.displayName
        ? profileRecord.displayName
        : `@${props.profile.handle}`}
    </h3>
  );

  const handleElement = profileRecord.displayName && (
    <div
      className={`profileHandle text-secondary ${props.popover ? "text-sm" : "text-sm"}  px-3 sm:px-4 truncate`}
    >
      @{props.profile.handle}
    </div>
  );
  console.log(props.profile);

  return (
    <div
      className={`profileHeader flex flex-col relative `}
      id="profile-header"
    >
      {!props.popover && <ProfileLinks handle={props.profile.handle || ""} />}
      <div className="profileInfo flex flex-col gap-3">
        <div className="profileNameAndHandle flex flex-col ">
          {props.popover ? (
            <SpeedyLink className={"hover:no-underline!"} href={profileUrl}>
              {avatarElement}
            </SpeedyLink>
          ) : (
            avatarElement
          )}
          {displayNameElement}

          {handleElement}
          <KnownFollowers
            viewer={props.profile.viewer}
            did={props.profile.did}
          />

          <pre className="profileDescription pt-1 px-3 sm:px-4 whitespace-pre-wrap">
            {profileRecord.description
              ? parseDescription(profileRecord.description)
              : null}
          </pre>
        </div>

        <div className="profilePublicationCards w-full overflow-x-scroll">
          <div
            className={`grid grid-flow-col  gap-2 mx-auto w-fit px-3 sm:px-4 ${props.popover ? "auto-cols-[164px]" : "auto-cols-[164px] sm:auto-cols-[240px]"}`}
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
    <div className="profileLinks absolute sm:top-4 top-3 sm:right-4 right-3 flex flex-row gap-2">
      <a
        className="text-tertiary hover:text-accent-contrast hover:no-underline!"
        href={`https://bsky.app/profile/${props.handle}`}
      >
        <BlueskyTiny />
      </a>
    </div>
  );
};
const PublicationCard = (props: { record: NormalizedPublication; uri: string }) => {
  const { record, uri } = props;
  const { bgLeaflet, bgPage, primary } = usePubTheme(record.theme);

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
        <PubIcon record={record} uri={uri} />
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
      href: `/p/${mention.value.slice(1)}`,
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
        <SpeedyLink key={key++} href={match.href}>
          {match.value}
        </SpeedyLink>,
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
  if (!props.viewer?.knownFollowers) return null;
  let count = props.viewer.knownFollowers.count;

  return (
    <>
      <div className="profileKnownFollowers sm:px-4 px-3 text-xs text-tertiary  italic">
        Followed by{" "}
        <a
          className="hover:underline"
          href={`https://bsky.app/profile/${props.did}/known-followers`}
          target="_blank"
        >
          {props.viewer?.knownFollowers?.followers[0]?.displayName}{" "}
          {count > 1 ? `and ${count - 1} other${count > 2 ? "s" : ""}` : ""}
        </a>
      </div>
    </>
  );
};
