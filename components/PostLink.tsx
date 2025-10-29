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

export const PostLink = (props: Post) => {
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

  let quotes = props.documents.document_mentions_in_bsky?.[0]?.count || 0;
  let comments =
    pubRecord.preferences?.showComments === false
      ? 0
      : props.documents.comments_on_documents?.[0]?.count || 0;

  return (
    <BaseThemeProvider {...theme} local>
      <div
        style={{
          backgroundImage: `url(${backgroundImage})`,
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
        <Link
          className="h-full w-full absolute top-0 left-0"
          href={`${props.publication.href}/${postUri.rkey}`}
        />
        <div
          className={`${showPageBackground ? "bg-bg-page " : "bg-transparent"}  rounded-md w-full  px-[10px] pt-2 pb-2`}
          style={{
            backgroundColor: showPageBackground
              ? "rgba(var(--bg-page), var(--bg-page-alpha))"
              : "transparent",
          }}
        >
          <h3 className="text-primary truncate">{postRecord.title}</h3>

          <p className="text-secondary">{postRecord.description}</p>
          <div className="flex flex-col-reverse md:flex-row md gap-4 md:gap-2 text-sm text-tertiary items-center justify-start pt-1.5 md:pt-3 w-full">
            <PubInfo
              href={props.publication.href}
              author={props.author || ""}
              pubRecord={pubRecord}
              uri={props.publication.uri}
            />
            <Separator classname="h-4 !min-h-0 md:block hidden" />
            <div className="flex flex-row justify-between gap-2 items-center w-full">
              <PostInfo
                author={props.author || ""}
                publishedAt={postRecord.publishedAt}
              />
              <InteractionPreview
                postUrl={`${props.publication.href}/${postUri.rkey}`}
                quotesCount={quotes}
                commentsCount={comments}
                tagsCount={6}
                showComments={pubRecord.preferences?.showComments}
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
  author: string;
}) => {
  return (
    <div className="flex gap-2 md:w-auto shrink-0 w-full">
      <Link
        href={props.href}
        className="text-accent-contrast font-bold no-underline text-sm flex gap-1 items-center md:w-fit relative shrink-0"
      >
        <PubIcon small record={props.pubRecord} uri={props.uri} />
        {props.pubRecord.name}
      </Link>

      <div className="truncate">{props.author}</div>
    </div>
  );
};

const PostInfo = (props: {
  author: string;
  publishedAt: string | undefined;
}) => {
  return (
    <div className="flex gap-2 items-center shrink-0 self-start">
      {props.publishedAt && (
        <>
          <div className="shrink-0">
            {new Date(props.publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
        </>
      )}
    </div>
  );
};
