"use client";
import { AtUri } from "@atproto/api";
import { PubIcon } from "components/ActionBar/Publications";
import { CommentTiny } from "components/Icons/CommentTiny";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { Separator } from "components/Layout";
import { usePubTheme } from "components/ThemeManager/PublicationThemeProvider";
import { BaseThemeProvider } from "components/ThemeManager/ThemeProvider";
import { useSmoker } from "components/Toast";
import { PubLeafletDocument, PubLeafletPublication } from "lexicons/api";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import type { Post } from "app/(home-pages)/reader/getReaderFeed";

import Link from "next/link";
import { InteractionPreview } from "./InteractionsPreview";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";

export const PostListing = (props: Post) => {
  let pubRecord = props.publication?.pubRecord as
    | PubLeafletPublication.Record
    | undefined;

  let postRecord = props.documents.data as PubLeafletDocument.Record;
  let postUri = new AtUri(props.documents.uri);
  let uri = props.publication ? props.publication?.uri : props.documents.uri;

  // For standalone documents (no publication), pass isStandalone to get correct defaults
  let isStandalone = !pubRecord;
  let theme = usePubTheme(pubRecord?.theme || postRecord?.theme, isStandalone);
  let themeRecord = pubRecord?.theme || postRecord?.theme;
  let backgroundImage =
    themeRecord?.backgroundImage?.image?.ref && uri
      ? blobRefToSrc(themeRecord.backgroundImage.image.ref, new AtUri(uri).host)
      : null;

  let backgroundImageRepeat = themeRecord?.backgroundImage?.repeat;
  let backgroundImageSize = themeRecord?.backgroundImage?.width || 500;

  let showPageBackground = pubRecord
    ? pubRecord?.theme?.showPageBackground
    : postRecord.theme?.showPageBackground ?? true;

  let quotes = props.documents.document_mentions_in_bsky?.[0]?.count || 0;
  let comments =
    pubRecord?.preferences?.showComments === false
      ? 0
      : props.documents.comments_on_documents?.[0]?.count || 0;
  let tags = (postRecord?.tags as string[] | undefined) || [];

  // For standalone posts, link directly to the document
  let postHref = props.publication
    ? `${props.publication.href}/${postUri.rkey}`
    : `/p/${postUri.host}/${postUri.rkey}`;

  return (
    <BaseThemeProvider {...theme} local>
      <div
        style={{
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : undefined,
          backgroundRepeat: backgroundImageRepeat ? "repeat" : "no-repeat",
          backgroundSize: `${backgroundImageRepeat ? `${backgroundImageSize}px` : "cover"}`,
        }}
        className={`no-underline! flex flex-row gap-2 w-full relative
          bg-bg-leaflet
          border border-border-light rounded-lg
          sm:p-2 p-2 selected-outline
          hover:outline-accent-contrast hover:border-accent-contrast
          `}
      >
        <Link className="h-full w-full absolute top-0 left-0" href={postHref} />
        <div
          className={`${showPageBackground ? "bg-bg-page " : "bg-transparent"}  rounded-md w-full  px-[10px] pt-2 pb-2`}
          style={{
            backgroundColor: showPageBackground
              ? "rgba(var(--bg-page), var(--bg-page-alpha))"
              : "transparent",
          }}
        >
          <h3 className="text-primary truncate">{postRecord.title}</h3>

          <p className="text-secondary italic">{postRecord.description}</p>
          <div className="flex flex-col-reverse md:flex-row md gap-2 text-sm text-tertiary items-center justify-start pt-1.5 md:pt-3 w-full">
            {props.publication && pubRecord && (
              <PubInfo
                href={props.publication.href}
                pubRecord={pubRecord}
                uri={props.publication.uri}
              />
            )}
            <div className="flex flex-row justify-between gap-2 items-center w-full">
              <PostInfo publishedAt={postRecord.publishedAt} />
              <InteractionPreview
                postUrl={postHref}
                quotesCount={quotes}
                commentsCount={comments}
                tags={tags}
                showComments={pubRecord?.preferences?.showComments !== false}
                showMentions={pubRecord?.preferences?.showMentions !== false}
                share
              />
            </div>
          </div>
        </div>
      </div>
    </BaseThemeProvider>
  );
};

const PubInfo = (props: {
  href: string;
  pubRecord: PubLeafletPublication.Record;
  uri: string;
}) => {
  return (
    <div className="flex flex-col md:w-auto shrink-0 w-full">
      <hr className="md:hidden block border-border-light mb-2" />
      <Link
        href={props.href}
        className="text-accent-contrast font-bold no-underline text-sm flex gap-1 items-center md:w-fit relative shrink-0"
      >
        <PubIcon small record={props.pubRecord} uri={props.uri} />
        {props.pubRecord.name}
      </Link>
    </div>
  );
};

const PostInfo = (props: { publishedAt: string | undefined }) => {
  let localizedDate = useLocalizedDate(props.publishedAt || "", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return (
    <div className="flex gap-2 items-center shrink-0 self-start">
      {props.publishedAt && (
        <>
          <div className="shrink-0">{localizedDate}</div>
        </>
      )}
    </div>
  );
};
