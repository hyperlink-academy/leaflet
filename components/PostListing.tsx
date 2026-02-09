"use client";
import { AtUri } from "@atproto/api";
import { PubIcon } from "components/ActionBar/Publications";
import { usePubTheme } from "components/ThemeManager/PublicationThemeProvider";
import { BaseThemeProvider } from "components/ThemeManager/ThemeProvider";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import type {
  NormalizedDocument,
  NormalizedPublication,
} from "src/utils/normalizeRecords";
import type { Post } from "app/(home-pages)/reader/getReaderFeed";

import Link from "next/link";
import { InteractionPreview, TagPopover } from "./InteractionsPreview";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { useSmoker } from "./Toast";
import { Separator } from "./Layout";
import { CommentTiny } from "./Icons/CommentTiny";
import { QuoteTiny } from "./Icons/QuoteTiny";
import { ShareTiny } from "./Icons/ShareTiny";
import { useSelectedPostListing } from "src/useSelectedPostState";

export const PostListing = (props: Post) => {
  let pubRecord = props.publication?.pubRecord as
    | NormalizedPublication
    | undefined;

  let postRecord = props.documents.data as NormalizedDocument | null;

  // Don't render anything for records that can't be normalized (e.g., site.standard records without expected fields)
  if (!postRecord) {
    return null;
  }
  let postUri = new AtUri(props.documents.uri);
  let uri = props.publication ? props.publication?.uri : props.documents.uri;

  // For standalone documents (no publication), pass isStandalone to get correct defaults
  let isStandalone = !pubRecord;
  let theme = usePubTheme(pubRecord?.theme || postRecord?.theme, isStandalone);
  let themeRecord = pubRecord?.theme || postRecord?.theme;
  let el = document?.getElementById(`post-listing-${postUri}`);

  let hasBackgroundImage =
    !!themeRecord?.backgroundImage?.image &&
    el &&
    Number(window.getComputedStyle(el).getPropertyValue("--bg-page-alpha")) <
      0.7;

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
  let postUrl = props.publication
    ? `${props.publication.href}/${postUri.rkey}`
    : `/p/${postUri.host}/${postUri.rkey}`;

  return (
    <div className="postListing flex flex-col gap-1">
      <div className="text-sm  text-tertiary flex gap-1 items-center px-1 ">
        <div className="flex ">
          <div className="sm:w-4 w-4 sm:h-4 h-4 rounded-full bg-test border border-border-light first:ml-0 -ml-2" />
          <div className="sm:w-4 w-4 sm:h-4 h-4 rounded-full bg-test border border-border-light first:ml-0 -ml-2" />
        </div>
        others recommend
      </div>
      <BaseThemeProvider {...theme} local>
        <div
          id={`post-listing-${postUri}`}
          className={`
          relative
          flex flex-col overflow-hidden
          selected-outline border-border-light rounded-lg w-full  hover:outline-accent-contrast
          hover:border-accent-contrast
          ${showPageBackground ? "bg-bg-page " : "bg-bg-leaflet"} `}
          style={
            hasBackgroundImage
              ? {
                  backgroundImage: backgroundImage
                    ? `url(${backgroundImage})`
                    : undefined,
                  backgroundRepeat: backgroundImageRepeat
                    ? "repeat"
                    : "no-repeat",
                  backgroundSize: backgroundImageRepeat
                    ? `${backgroundImageSize}px`
                    : "cover",
                }
              : {}
          }
        >
          <Link
            className="h-full w-full absolute top-0 left-0"
            href={postUrl}
          />
          {postRecord.coverImage && (
            <div className="postListingImage">
              <img
                src={blobRefToSrc(postRecord.coverImage.ref, postUri.host)}
                alt={postRecord.title || ""}
                className="w-full h-auto aspect-video rounded"
              />
            </div>
          )}
          <div className="postListingInfo px-3 py-2">
            <h3 className="postListingTitle text-primary line-clamp-2 sm:text-lg text-base">
              {postRecord.title}
            </h3>

            <p className="postListingDescription text-secondary line-clamp-3 sm:text-base text-sm">
              {postRecord.description}
            </p>
            <div className="flex flex-col-reverse md:flex-row md gap-2 text-sm text-tertiary items-center justify-start pt-1.5 md:pt-3 w-full">
              {props.publication && pubRecord && (
                <PubInfo
                  href={props.publication.href}
                  pubRecord={pubRecord}
                  uri={props.publication.uri}
                />
              )}
              <div className="flex flex-row justify-between gap-2 text-xs items-center w-full">
                <PostDate publishedAt={postRecord.publishedAt} />
                {tags.length === 0 ? null : <TagPopover tags={tags!} />}
              </div>
            </div>
          </div>
        </div>
      </BaseThemeProvider>
      <div className="text-sm flex justify-between text-tertiary">
        <Interactions
          postUrl={postUrl}
          quotesCount={quotes}
          commentsCount={comments}
          tags={tags}
          showComments={pubRecord?.preferences?.showComments !== false}
          showMentions={pubRecord?.preferences?.showMentions !== false}
          documentUri={props.documents.uri}
          document={postRecord}
        />
        <Share postUrl={postUrl} />
      </div>
    </div>
  );
};

const PubInfo = (props: {
  href: string;
  pubRecord: NormalizedPublication;
  uri: string;
}) => {
  return (
    <div className="flex flex-col md:w-auto shrink-0 w-full">
      <hr className="md:hidden block border-border-light mb-1" />
      <Link
        href={props.href}
        className="text-accent-contrast font-bold no-underline text-sm flex gap-[6px] items-center md:w-fit relative shrink-0"
      >
        <PubIcon tiny record={props.pubRecord} uri={props.uri} />
        {props.pubRecord.name}
      </Link>
    </div>
  );
};

const PostDate = (props: { publishedAt: string | undefined }) => {
  let localizedDate = useLocalizedDate(props.publishedAt || "", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  if (props.publishedAt) {
    return <div className="shrink-0 sm:text-sm text-xs">{localizedDate}</div>;
  } else return null;
};

const Interactions = (props: {
  quotesCount: number;
  commentsCount: number;
  tags?: string[];
  postUrl: string;
  showComments: boolean;
  showMentions: boolean;
  documentUri: string;
  document: NormalizedDocument;
}) => {
  let setSelectedPostListing = useSelectedPostListing(
    (s) => s.setSelectedPostListing,
  );
  let selectPostListing = (drawer: "quotes" | "comments") => {
    setSelectedPostListing({
      document_uri: props.documentUri,
      document: props.document,
      drawer,
    });
  };

  return (
    <div
      className={`flex gap-2 text-tertiary text-sm  items-center justify-between px-1`}
    >
      <div className="postListingsInteractions flex gap-3">
        {!props.showMentions || props.quotesCount === 0 ? null : (
          <button
            aria-label="Post quotes"
            onClick={() => selectPostListing("quotes")}
            className="relative flex flex-row gap-1 text-sm items-center hover:text-accent-contrast text-tertiary"
          >
            <QuoteTiny /> {props.quotesCount}
          </button>
        )}
        {!props.showComments || props.commentsCount === 0 ? null : (
          <button
            aria-label="Post comments"
            onClick={() => selectPostListing("comments")}
            className="relative flex flex-row gap-1 text-sm items-center hover:text-accent-contrast text-tertiary"
          >
            <CommentTiny /> {props.commentsCount}
          </button>
        )}
      </div>
    </div>
  );
};

const Share = (props: { postUrl: string }) => {
  let smoker = useSmoker();
  return (
    <button
      id={`copy-post-link-${props.postUrl}`}
      className="flex gap-1 items-center hover:text-accent-contrast relative font-bold"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        let mouseX = e.clientX;
        let mouseY = e.clientY;

        if (!props.postUrl) return;
        navigator.clipboard.writeText(`leaflet.pub${props.postUrl}`);

        smoker({
          text: <strong>Copied Link!</strong>,
          position: {
            y: mouseY,
            x: mouseX,
          },
        });
      }}
    >
      Share <ShareTiny />
    </button>
  );
};
