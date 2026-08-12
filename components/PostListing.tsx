"use client";
import { AtUri } from "@atproto/api";
import { PubIcon } from "components/ActionBar/Publications";
import { PublicationThemeWrapper } from "components/ThemeManager/PublicationThemeProvider";
import { blobRefToSrc, COVER_THUMBNAIL_WIDTH } from "src/utils/blobRefToSrc";
import type {
  NormalizedDocument,
  NormalizedPublication,
} from "src/utils/normalizeRecords";
import { hasLeafletContent } from "lexicons/src/normalize";
import { postHasMembersDelimiter } from "src/membership";
import type { Post } from "actions/reader/getReaderFeed";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PostByline } from "./PostByline";
import { namedBylineProfiles } from "src/utils/byline";
import { useSelectedPostListing } from "src/useSelectedPostState";
import { useReaderPostViewer } from "src/useReaderPostViewer";
import { preload } from "swr";
import { checkUrlFrameable } from "actions/checkUrlFrameable";
import { mergePreferences } from "src/utils/mergePreferences";
import { ExternalLinkTiny } from "./Icons/ExternalLinkTiny";
import { getDocumentURL } from "src/utils/getPublicationURL";
import { RecommendButton } from "./Interactions/RecommendButton";
import { getFirstParagraph } from "src/utils/getFirstParagraph";
import { DiscussionButton } from "./Interactions/DiscussionButton";
import { InteractionShareButton } from "./Interactions/InteractionShareButton";
import { PublicationPostItemLarge } from "app/(app)/(published)/lish/[did]/[publication]/PublicationPostItem";
import { LocalizedDate } from "app/(app)/(published)/lish/[did]/[publication]/LocalizedDate";

export const PostListing = (
  props: Post & {
    selected?: boolean;
    onOpenInViewer?: () => void;
    // Reader feeds: open discussions in the post viewer's in-box panel
    // instead of the standalone DiscussionModal.
    onOpenDiscussionsInViewer?: () => void;
  },
) => {
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

  // Modified clicks (new tab, etc.) fall through to the link instead of the
  // reader's viewer.
  let openInViewer = props.onOpenInViewer;
  let onPostLinkClick = openInViewer
    ? (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        openInViewer();
      }
    : undefined;

  // Warm the viewer's hidden iframe (see useReaderPostViewer.preloadUrl) on
  // hover intent or touch-down. The 150ms hover delay keeps a mouse transiting
  // the feed from firing a page load per card; the delayed clear on touch-up
  // outlives the tap's click, and clearing after the viewer opened is a no-op.
  let setPreloadUrl = useReaderPostViewer((s) => s.setPreloadUrl);
  let clearPreloadUrl = useReaderPostViewer((s) => s.clearPreloadUrl);
  let hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  let startPreload = () => {
    setPreloadUrl(postUrl);
    if (!hasLeafletContent(postRecord))
      preload(`frameable-${postUrl}`, () => checkUrlFrameable(postUrl));
  };
  let preloadHandlers = openInViewer
    ? {
        onMouseEnter: () => {
          hoverTimer.current = setTimeout(startPreload, 150);
        },
        onMouseLeave: () => {
          if (hoverTimer.current) clearTimeout(hoverTimer.current);
          clearPreloadUrl(postUrl);
        },
        onTouchStart: startPreload,
        onTouchEnd: () => setTimeout(() => clearPreloadUrl(postUrl), 300),
        onTouchCancel: () => setTimeout(() => clearPreloadUrl(postUrl), 300),
      }
    : undefined;

  let coverImageSrc = postRecord.coverImage
    ? blobRefToSrc(postRecord.coverImage.ref, postUri.host, undefined, {
        width: COVER_THUMBNAIL_WIDTH.large,
      })
    : undefined;


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
    // Above the card's full-bleed PostLink overlay (z-[1]) so these controls
    // receive their clicks instead of the link/viewer.
    <div className="relative z-[2] text-sm flex gap-4 items-center text-tertiary shrink-0">
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
        openDiscussionsInViewer={props.onOpenDiscussionsInViewer}
      />
      <InteractionShareButton
        postRecord={postRecord}
        postUrl={postUrl}
        documentUri={props.documents.uri}
        publication={pubRecord}
        pubUri={props.publication?.uri}
      />
    </div>
  );

  return (
    <div className="postListing flex flex-col gap-1" {...preloadHandlers}>
      <PublicationThemeWrapper postRecord={postRecord} pubRecord={pubRecord}>
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
            onClick={onPostLinkClick}
            membersOnly={postHasMembersDelimiter(postRecord)}
            title={postRecord.title}
            description={
              postRecord.description || getFirstParagraph(postRecord)
            }
            author={author}
            date={date}
            interactions={interactions}
            pubInfo={pubInfo}
            coverImageSrc={coverImageSrc}
            coverImageAlt={postRecord.title}
          />
        </div>
      </PublicationThemeWrapper>
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
        className="text-accent-contrast font-bold no-underline! text-sm flex gap-[6px] items-center relative z-[2] grow w-max shrink-0 min-w-0"
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
  if (!props.publishedAt) return null;
  return (
    <div className="shrink-0 sm:text-sm text-sm">
      <LocalizedDate
        dateString={props.publishedAt}
        omitYear
        options={{ year: "2-digit", month: "short", day: "numeric" }}
      />
    </div>
  );
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
  openDiscussionsInViewer?: () => void;
}) => {
  let setSelectedPostListing = useSelectedPostListing(
    (s) => s.setSelectedPostListing,
  );
  let defaultDrawer: "comments" | "quotes" =
    props.showComments && props.commentsCount > 0 ? "comments" : "quotes";

  return (
    <div className={`flex gap-4 text-tertiary text-sm  items-center`}>
      <div className="postListingsInteractions flex gap-4">
        <RecommendButton
          documentUri={props.documentUri}
          recommendsCount={props.recommendsCount}
        />
        <DiscussionButton
          documentUri={props.documentUri}
          commentsCount={props.commentsCount}
          quotesCount={props.quotesCount}
          showComments={props.showComments}
          showMentions={props.showMentions}
          postUrl={props.postUrl}
          title={props.document.title}
          onClick={
            props.openDiscussionsInViewer
              ? () => props.openDiscussionsInViewer!()
              : undefined
          }
          onOpenChange={(open) => {
            // Keep the listing highlighted (read by the reader feed) while the
            // modal is up.
            if (open)
              setSelectedPostListing({
                document_uri: props.documentUri,
                document: props.document,
                publication: props.publication,
                drawer: defaultDrawer,
              });
            else setSelectedPostListing(null);
          }}
        />
      </div>
    </div>
  );
};
