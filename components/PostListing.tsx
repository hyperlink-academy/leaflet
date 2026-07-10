"use client";
import { AtUri } from "@atproto/api";
import { PubIcon } from "components/ActionBar/Publications";
import { usePubTheme } from "components/ThemeManager/PublicationThemeProvider";
import { BaseThemeProvider } from "components/ThemeManager/ThemeProvider";
import { blobRefToSrc, COVER_THUMBNAIL_WIDTH } from "src/utils/blobRefToSrc";
import type {
  NormalizedDocument,
  NormalizedPublication,
} from "src/utils/normalizeRecords";
import { hasLeafletContent } from "lexicons/src/normalize";
import type { Post } from "app/(app)/(home-pages)/reader/getReaderFeed";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PostByline } from "./PostByline";
import { namedBylineProfiles } from "src/utils/byline";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { CommentTiny } from "./Icons/CommentTiny";
import { useSelectedPostListing } from "src/useSelectedPostState";
import { mergePreferences } from "src/utils/mergePreferences";
import { ExternalLinkTiny } from "./Icons/ExternalLinkTiny";
import { getDocumentURL } from "app/(app)/lish/createPub/getPublicationURL";
import { RecommendButton } from "./RecommendButton";
import { getFirstParagraph } from "src/utils/getFirstParagraph";
import { DiscussionModal } from "./DiscussionModal";
import { InteractionShareButton } from "./InteractionShareButton";
import { PublicationPostItemLarge } from "app/(app)/lish/[did]/[publication]/PublicationPostItem";

export const PostListing = (props: Post & { selected?: boolean }) => {
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
  let themeSource =
    pubRecord?.theme || pubRecord?.basicTheme ? pubRecord : postRecord;
  let theme = usePubTheme(themeSource, isStandalone);
  let themeRecord = pubRecord?.theme || postRecord?.theme;
  let elRef = useRef<HTMLDivElement>(null);
  let [hasBackgroundImage, setHasBackgroundImage] = useState(false);

  useEffect(() => {
    if (!themeRecord?.backgroundImage?.image || !elRef.current) {
      setHasBackgroundImage(false);
      return;
    }
    let alpha = Number(
      window
        .getComputedStyle(elRef.current)
        .getPropertyValue("--bg-page-alpha"),
    );
    setHasBackgroundImage(alpha < 0.7);
  }, [themeRecord?.backgroundImage?.image]);

  let backgroundImage =
    themeRecord?.backgroundImage?.image?.ref && uri
      ? blobRefToSrc(themeRecord.backgroundImage.image.ref, new AtUri(uri).host)
      : null;

  let backgroundImageRepeat = themeRecord?.backgroundImage?.repeat;
  let backgroundImageSize = themeRecord?.backgroundImage?.width || 500;

  let showPageBackground = pubRecord
    ? pubRecord?.theme?.showPageBackground
    : postRecord.theme?.showPageBackground ?? true;

  let mergedPrefs = mergePreferences(
    postRecord?.preferences,
    pubRecord?.preferences,
  );

  let quotes =
    props.documents.mentionsCount ??
    props.documents.document_mentions_in_bsky?.[0]?.count ??
    0;
  let comments =
    mergedPrefs.showComments === false
      ? 0
      : props.documents.comments_on_documents?.[0]?.count || 0;
  let recommends = props.documents.recommends_on_documents?.[0]?.count || 0;
  let tags = (postRecord?.tags as string[] | undefined) || [];

  let namedContributors = namedBylineProfiles(props.contributors);

  // For standalone posts, link directly to the document
  let postUrl = getDocumentURL(postRecord, props.documents.uri, pubRecord);

  let coverImageSrc = postRecord.coverImage
    ? blobRefToSrc(postRecord.coverImage.ref, postUri.host, undefined, {
        width: COVER_THUMBNAIL_WIDTH.large,
      })
    : undefined;

  // Compute nodes conditionally so MetaRow doesn't render an orphan Separator
  // when there's no author or no date.
  let author =
    namedContributors.length > 0 ? (
      <PostByline contributors={namedContributors} />
    ) : undefined;
  let date = postRecord.publishedAt ? (
    <PostDate publishedAt={postRecord.publishedAt} />
  ) : undefined;
  let pubInfo =
    props.publication && pubRecord ? (
      <PubInfo
        href={props.publication.href}
        pubRecord={pubRecord}
        uri={props.publication.uri}
        postRecord={postRecord}
      />
    ) : undefined;
  let interactions = (
    <div className="text-sm flex justify-between text-tertiary w-full">
      <Interactions
        postUrl={postUrl}
        quotesCount={quotes}
        commentsCount={comments}
        recommendsCount={recommends}
        tags={tags}
        showComments={mergedPrefs.showComments !== false}
        showMentions={mergedPrefs.showMentions !== false}
        documentUri={props.documents.uri}
        document={postRecord}
        publication={pubRecord}
      />
      <InteractionShareButton postUrl={postUrl} type="weak" />
    </div>
  );

  return (
    <div className="postListing flex flex-col gap-1">
      <BaseThemeProvider {...theme} local>
        <div
          ref={elRef}
          id={`post-listing-${postUri}`}
          className={`
          relative
          flex flex-col overflow-hidden
          selected-outline  rounded-lg w-full
          ${props.selected ? "outline-2 outline-offset-1 outline-accent-contrast border-accent-contrast" : "hover:outline-accent-contrast hover:border-accent-contrast border-border-light"}
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
          <PublicationPostItemLarge
            href={postUrl}
            title={postRecord.title}
            description={postRecord.description || getFirstParagraph(postRecord)}
            author={author}
            date={date}
            interactions={interactions}
            pubInfo={pubInfo}
            coverImageSrc={coverImageSrc}
            coverImageAlt={postRecord.title}
          />
        </div>
      </BaseThemeProvider>
    </div>
  );
};

const PubInfo = (props: {
  href: string;
  pubRecord: NormalizedPublication;
  uri: string;
  postRecord: NormalizedDocument;
}) => {
  let isLeaflet = hasLeafletContent(props.postRecord);
  let cleanUrl = props.pubRecord.url
    ?.replace(/^https?:\/\//, "")
    .replace(/^www\./, "");

  return (
    <div className="flex justify-between gap-4 w-full pb-1">
      <Link
        href={props.href}
        className="text-accent-contrast font-bold no-underline! text-sm flex gap-[6px] items-center relative grow w-max shrink-0 min-w-0"
      >
        <PubIcon
          tiny
          icon={
            props.pubRecord.icon
              ? blobRefToSrc(
                  props.pubRecord.icon.ref,
                  new AtUri(props.uri).host,
                )
              : undefined
          }
          pubName={props.pubRecord.name}
        />
        <div className="w-max min-w-0">{props.pubRecord.name}</div>
      </Link>
      {!isLeaflet && (
        <div className="text-sm flex flex-row items-center text-tertiary gap-1  min-w-0">
          <div className="truncate min-w-0">{cleanUrl}</div>
          <ExternalLinkTiny className="shrink-0" />
        </div>
      )}
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
    return <div className="shrink-0 sm:text-sm text-sm">{localizedDate}</div>;
  } else return null;
};

const Interactions = (props: {
  quotesCount: number;
  commentsCount: number;
  recommendsCount: number;
  tags?: string[];
  postUrl: string;
  showComments: boolean;
  showMentions: boolean;
  documentUri: string;
  document: NormalizedDocument;
  publication?: NormalizedPublication;
}) => {
  let setSelectedPostListing = useSelectedPostListing(
    (s) => s.setSelectedPostListing,
  );
  let [discussionsOpen, setDiscussionsOpen] = useState(false);
  let defaultDrawer: "comments" | "quotes" =
    props.showComments && props.commentsCount > 0 ? "comments" : "quotes";
  let openDiscussions = () => {
    // Keep the listing highlighted (read by the reader feed) while the modal is up.
    setSelectedPostListing({
      document_uri: props.documentUri,
      document: props.document,
      publication: props.publication,
      drawer: defaultDrawer,
    });
    setDiscussionsOpen(true);
  };

  let commentsAvailable = props.showComments && props.commentsCount > 0;
  let mentionsAvailable = props.showMentions && props.quotesCount > 0;
  let discussionsAvailable = commentsAvailable || mentionsAvailable;

  return (
    <div
      className={`flex gap-2 text-tertiary text-sm  items-center justify-between`}
    >
      <div className="postListingsInteractions flex gap-3">
        <RecommendButton
          documentUri={props.documentUri}
          recommendsCount={props.recommendsCount}
        />
        {!discussionsAvailable ? null : (
          <button
            aria-label="Post discussions"
            onClick={openDiscussions}
            className="relative flex flex-row gap-1 text-sm items-center hover:text-accent-contrast text-tertiary"
          >
            <CommentTiny /> {props.commentsCount + props.quotesCount}
          </button>
        )}
      </div>
      {discussionsAvailable && (
        <DiscussionModal
          open={discussionsOpen}
          onOpenChange={(open) => {
            setDiscussionsOpen(open);
            if (!open) setSelectedPostListing(null);
          }}
          document_uri={props.documentUri}
          postUrl={props.postUrl}
          title={props.document.title}
          commentsCount={props.commentsCount}
          quotesCount={props.quotesCount}
          showComments={props.showComments}
          showMentions={props.showMentions}
        />
      )}
    </div>
  );
};
