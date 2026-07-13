"use client";
import { AtUri } from "@atproto/api";
import Link from "next/link";
import {
  PublicationPostItemSmall,
  PublicationPostItemMedium,
  PublicationPostItemLarge,
} from "app/(app)/lish/[did]/[publication]/PublicationPostItem";
import { LocalizedDate } from "app/(app)/lish/[did]/[publication]/LocalizedDate";
import {
  getDocumentURL,
  getPublicationURL,
} from "app/(app)/lish/createPub/getPublicationURL";
import { getFirstParagraph } from "src/utils/getFirstParagraph";
import { blobRefToSrc, COVER_THUMBNAIL_WIDTH } from "src/utils/blobRefToSrc";
import { useStandardSitePost } from "components/StandardSitePostDataProvider";
import { useEntity, useReplicache } from "src/replicache";
import { InteractionPreview } from "components/Interactions/InteractionsPreview";
import { PubIcon } from "components/ActionBar/Publications";
import type { StandardSitePostData } from "app/api/rpc/[command]/get_standard_site_posts";
import { formatBylineNames } from "src/utils/byline";

export type StandardSitePostSize = "large" | "medium" | "small";

export function StandardSitePostItem({
  uri,
  size = "medium",
  currentPublicationUri,
  pageWidth,
  hideInteractions,
}: {
  uri: string;
  size?: StandardSitePostSize;
  currentPublicationUri?: string | null;
  pageWidth?: number;
  hideInteractions?: boolean;
}) {
  const { data, isLoading } = useStandardSitePost(uri);
  const { rootEntity } = useReplicache();
  const postPageWidth = useEntity(rootEntity, "theme/page-width")?.data.value;

  if (isLoading) {
    return (
      <StandardSitePostItemPlaceholder
        size={size}
        pageWidth={pageWidth ? pageWidth : postPageWidth}
      />
    );
  }

  if (!data) {
    return <p className="text-sm italic text-tertiary">Post not found.</p>;
  }

  return (
    <StandardSitePostItemView
      post={data}
      size={size}
      pageWidth={pageWidth}
      currentPublicationUri={currentPublicationUri}
      hideInteractions={hideInteractions}
    />
  );
}

function StandardSitePostItemPlaceholder({
  size,
  pageWidth,
}: {
  size: StandardSitePostSize;
  pageWidth?: number;
}) {
  if (size === "small") {
    return (
      <>
        <div className="transparent-container flex w-full grow flex-col gap-1 p-3 ">
          <div className="h-7 w-2/3 bg-border-light rounded animate-pulse" />
          <div className="h-4 w-32 bg-border-light rounded animate-pulse" />
        </div>
        <hr className="last:hidden border-border-light" />
      </>
    );
  }

  if (size === "medium") {
    return (
      <>
        <div className="transparent-container flex w-full gap-3 items-stretch sm:min-h-36">
          <div className="flex w-full gap-2 grow flex-col justify-between min-w-0 pl-3 p-3">
            <div className="flex flex-col gap-2">
              <div className="h-7 w-2/3 bg-border-light rounded animate-pulse" />
              <div className="h-4 w-full bg-border-light rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-border-light rounded animate-pulse" />
            </div>
            <div className="h-4 w-32 bg-border-light rounded animate-pulse" />
          </div>
          <div className="self-start shrink-0 aspect-square w-16 sm:w-36 bg-border-light rounded animate-pulse" />
        </div>
        <hr className="last:hidden border-border-light" />
      </>
    );
  }

  const widePage = (pageWidth ?? 0) >= 768;
  return (
    <>
      <div
        className={`transparent-container flex flex-col items-stretch ${widePage ? "sm:flex-row sm:gap-2 gap-0" : ""} w-full items-start`}
      >
        <div
          className={`bg-border-light rounded animate-pulse shrink-0 ${widePage ? "w-full sm:w-auto sm:h-[244px] aspect-[3/2]" : "w-full aspect-[1.91/1]"}`}
        />
        <div
          className={`flex w-full grow flex-col gap-2 justify-between p-3 pb-2 ${widePage ? "sm:pb-3" : ""}`}
        >
          <div className="flex flex-col gap-2">
            <div
              className={`h-7 w-1/3 bg-border-light rounded animate-pulse ${widePage ? "sm:h-8" : ""}`}
            />
            <div
              className={`h-5 w-full bg-border-light rounded animate-pulse ${widePage ? "sm:h-6" : ""}`}
            />
            <div
              className={`h-5 w-5/6 bg-border-light rounded animate-pulse ${widePage ? "sm:h-6" : ""}`}
            />
          </div>
          <div
            className={`h-4 w-32 bg-border-light rounded animate-pulse ${widePage ? "sm:h-5" : ""}`}
          />
        </div>
      </div>
      <hr className="last:hidden border-border-light" />
    </>
  );
}

export function StandardSitePostItemView({
  post,
  size = "medium",
  currentPublicationUri,
  hideInteractions,
  pageWidth: pageWidthProp,
}: {
  post: StandardSitePostData;
  size?: StandardSitePostSize;
  currentPublicationUri?: string | null;
  hideInteractions?: boolean;
  pageWidth?: number;
}) {
  const docUrl = getDocumentURL(
    post.record,
    post.uri,
    post.publication ?? undefined,
  );
  // Prefer explicit contributors for the byline; fall back to the single
  // document author when there are none. Use the bare handle (no `@` prefix)
  // so this list view matches the post page byline.
  const bylineLabel = (p: {
    displayName: string | null;
    handle: string | null;
  }) => p.displayName || p.handle || undefined;
  const authorLabel =
    post.contributors.length > 0
      ? formatBylineNames(
          post.contributors.map(bylineLabel).filter((l): l is string => !!l),
        ) || undefined
      : bylineLabel(post.author ?? { displayName: null, handle: null });
  const date = post.record.publishedAt ? (
    <LocalizedDate
      dateString={post.record.publishedAt}
      options={{ year: "numeric", month: "long", day: "2-digit" }}
    />
  ) : undefined;
  const description = post.record.description || getFirstParagraph(post.record);

  let postDid: string | undefined;
  try {
    postDid = new AtUri(post.uri).host;
  } catch {
    postDid = undefined;
  }
  const coverImageSrc =
    post.record.coverImage && postDid
      ? blobRefToSrc(post.record.coverImage.ref, postDid, undefined, {
          width:
            size === "large"
              ? COVER_THUMBNAIL_WIDTH.large
              : COVER_THUMBNAIL_WIDTH.medium,
        })
      : undefined;

  const { rootEntity } = useReplicache();
  const themePageWidth = useEntity(rootEntity, "theme/page-width")?.data.value;
  const pageWidth = pageWidthProp ?? themePageWidth;

  const publicationPrefs = post.publication?.record?.preferences;
  const showComments = publicationPrefs?.showComments !== false;
  const showMentions = publicationPrefs?.showMentions !== false;
  const showRecommends = publicationPrefs?.showRecommends !== false;
  const commentsCount = showComments ? post.commentsCount : 0;

  const noInteractions = !showComments && !showMentions && !showRecommends;

  const interactions =
    hideInteractions || noInteractions ? undefined : (
      <InteractionPreview
        postRecord={post.record}
        shareType="strong"
        quotesCount={post.mentionsCount}
        commentsCount={commentsCount}
        recommendsCount={post.recommendsCount}
        documentUri={post.uri}
        tags={post.record.tags || []}
        postUrl={docUrl}
        pubUri={post.publication?.uri}
        publication={post.publication?.record || undefined}
        showComments={showComments}
        showMentions={showMentions}
        showRecommends={showRecommends}
      />
    );

  const showPubFooter =
    !!post.publication?.record &&
    (!currentPublicationUri || post.publication.uri !== currentPublicationUri);

  const pubFooter =
    showPubFooter && post.publication ? (
      <PubInfo publication={post.publication} />
    ) : null;

  const commonProps = {
    href: docUrl,
    title: post.record.title,
    author: authorLabel,
    date,
    interactions,
    pubInfo: pubFooter,
  };

  if (size === "large") {
    return (
      <PublicationPostItemLarge
        {...commonProps}
        description={description}
        coverImageSrc={coverImageSrc}
        coverImageAlt={post.record.title}
        pageWidth={pageWidth}
      />
    );
  }
  if (size === "medium") {
    return (
      <PublicationPostItemMedium
        {...commonProps}
        description={description}
        coverImageSrc={coverImageSrc}
        coverImageAlt={post.record.title}
      />
    );
  }
  return <PublicationPostItemSmall {...commonProps} />;
}

function PubInfo({
  publication,
}: {
  publication: NonNullable<StandardSitePostData["publication"]>;
}) {
  if (!publication.record) return null;
  const pubUrl = getPublicationURL(publication);
  return (
    <Link
      href={pubUrl}
      // `relative w-fit` keeps this link clickable above the post's absolute
      // PostLink overlay while limiting the hit area to just the pub name.
      className="relative w-fit max-w-full flex items-center gap-1.5 text-accent-contrast font-bold no-underline! text-sm"
    >
      <PubIcon
        tiny
        className="w-3! h-3!"
        icon={
          publication.record.icon
            ? blobRefToSrc(
                publication.record.icon.ref,
                new AtUri(publication.uri).host,
              )
            : undefined
        }
        pubName={publication.record.name}
      />
      <span className="min-w-0 truncate">{publication.record.name}</span>
    </Link>
  );
}
