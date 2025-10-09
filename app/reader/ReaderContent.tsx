"use client";
import { AtUri } from "@atproto/api";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { PubIcon } from "components/ActionBar/Publications";
import { ShareSmall } from "components/Icons/ShareSmall";
import { Separator } from "components/Layout";
import { useCardBorderHidden } from "components/Pages/useCardBorderHidden";
import { SpeedyLink } from "components/SpeedyLink";
import { usePubTheme } from "components/ThemeManager/PublicationThemeProvider";
import { BaseThemeProvider } from "components/ThemeManager/ThemeProvider";
import { PubLeafletDocument, PubLeafletPublication } from "lexicons/api";
import Link from "next/link";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { Json } from "supabase/database.types";

export const ReaderContent = (props: {
  root_entity: string;
  posts: {
    publication: {
      href: string;
      pubRecord: Json;
      uri: string;
    };
    documents: { data: Json; uri: string; indexed_at: string };
  }[];
}) => {
  return (
    <div className="flex flex-col gap-3">
      {props.posts?.map((p) => <Post {...p} />)}
    </div>
  );
};

const Post = (props: {
  publication: {
    pubRecord: Json;
    uri: string;
    href: string;
  };
  documents: { data: Json | undefined; uri: string; indexed_at: string };
}) => {
  let pubRecord = props.publication.pubRecord as PubLeafletPublication.Record;

  let postRecord = props.documents.data as PubLeafletDocument.Record;
  let postUri = new AtUri(props.documents.uri);

  let theme = usePubTheme(pubRecord);
  let backgroundImage = pubRecord?.theme?.backgroundImage?.image?.ref
    ? blobRefToSrc(
        pubRecord?.theme?.backgroundImage?.image?.ref,
        new AtUri(props.publication.uri).host,
      )
    : null;

  let backgroundImageRepeat = pubRecord?.theme?.backgroundImage?.repeat;
  let backgroundImageSize = pubRecord?.theme?.backgroundImage?.width || 500;

  let showPageBackground = pubRecord.theme?.showPageBackground;

  return (
    <BaseThemeProvider {...theme} local>
      <SpeedyLink
        href={`${props.publication.href}/${postUri.rkey}`}
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundRepeat: backgroundImageRepeat ? "repeat" : "no-repeat",
          backgroundSize: `${backgroundImageRepeat ? `${backgroundImageSize}px` : "cover"}`,
        }}
        className={`no-underline! flex flex-row gap-2 w-full
          bg-bg-leaflet
          border border-border-light rounded-lg
          sm:p-2 p-2 selected-outline
          hover:outline-accent-contrast hover:border-accent-contrast
          `}
      >
        <div
          className={`${showPageBackground ? "bg-bg-page " : "bg-transparent"}  rounded-md w-full  px-[10px] pt-2 pb-2`}
          style={{
            backgroundColor: showPageBackground
              ? "rgba(var(--bg-page), var(--bg-page-alpha))"
              : "transparent",
          }}
        >
          <div className="flex justify-between gap-2">
            <button className="text-tertiary">{/*<ShareSmall />*/}</button>
          </div>
          <h3 className="text-primary truncate">{postRecord.title}</h3>

          <p className="text-secondary">{postRecord.description}</p>
          <div className="flex gap-2 text-sm text-tertiary items-center pt-3">
            <Link
              href={props.publication.href}
              className="text-accent-contrast font-bold no-underline text-sm flex gap-[6px] items-center"
            >
              <PubIcon small record={pubRecord} uri={props.publication.uri} />
              {pubRecord.name}
            </Link>
            <Separator classname="h-4 !min-h-0" />
            NAME HERE
            <Separator classname="h-4 !min-h-0" />
            {postRecord.publishedAt &&
              new Date(postRecord.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
          </div>
        </div>
      </SpeedyLink>
    </BaseThemeProvider>
  );
};
