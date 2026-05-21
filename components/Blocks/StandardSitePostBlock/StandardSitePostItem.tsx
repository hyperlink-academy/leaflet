"use client";
import { AtUri } from "@atproto/api";
import {
  PublicationPostItemSmall,
  PublicationPostItemMedium,
  PublicationPostItemLarge,
} from "app/lish/[did]/[publication]/PublicationPostItem";
import { LocalizedDate } from "app/lish/[did]/[publication]/LocalizedDate";
import { getDocumentURL } from "app/lish/createPub/getPublicationURL";
import { getFirstParagraph } from "src/utils/getFirstParagraph";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { useStandardSitePost } from "components/StandardSitePostDataProvider";
import { useEntity, useReplicache } from "src/replicache";
import { InteractionPreview } from "components/InteractionsPreview";
import type { StandardSitePostData } from "app/api/rpc/[command]/get_standard_site_posts";

export type StandardSitePostSize = "large" | "medium" | "small";

export function StandardSitePostItem({
  uri,
  size = "medium",
}: {
  uri: string;
  size?: StandardSitePostSize;
}) {
  const { data, isLoading } = useStandardSitePost(uri);
  const { rootEntity } = useReplicache();
  const pageWidth = useEntity(rootEntity, "theme/page-width")?.data.value;

  if (isLoading) {
    return <StandardSitePostItemPlaceholder size={size} pageWidth={pageWidth} />;
  }

  if (!data) {
    return (
      <p className="text-sm italic text-tertiary">
        Post not found.
      </p>
    );
  }

  return <StandardSitePostItemView post={data} size={size} />;
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
        <div className="flex w-full grow flex-col gap-1 px-3 py-2">
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
        <div className="flex w-full gap-3 items-stretch sm:h-36">
          <div className="flex w-full gap-2 grow flex-col justify-between min-w-0 pl-3 py-2">
            <div className="flex flex-col gap-1.5">
              <div className="h-7 w-2/3 bg-border-light rounded animate-pulse" />
              <div className="h-4 w-full bg-border-light rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-border-light rounded animate-pulse" />
            </div>
            <div className="h-4 w-32 bg-border-light rounded animate-pulse" />
          </div>
          <div className="self-stretch shrink-0 aspect-square w-16 sm:w-36 bg-border-light rounded animate-pulse" />
        </div>
        <hr className="last:hidden border-border-light" />
      </>
    );
  }

  const widePage = (pageWidth ?? 0) >= 768;
  return (
    <>
      <div
        className={`flex flex-col items-stretch ${widePage ? "sm:flex-row sm:gap-2 gap-0" : ""} w-full items-start`}
      >
        <div
          className={`bg-border-light rounded animate-pulse aspect-[1.91/1] ${widePage ? "w-full sm:w-2/5 shrink-0" : "w-full"}`}
        />
        <div
          className={`flex w-full grow flex-col gap-2 justify-between ${widePage ? "px-3 py-2 sm:pb-3" : "px-3 py-2"}`}
        >
          <div className="flex flex-col gap-1.5">
            <div
              className={`h-7 w-2/3 bg-border-light rounded animate-pulse ${widePage ? "sm:h-8" : ""}`}
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
}: {
  post: StandardSitePostData;
  size?: StandardSitePostSize;
}) {
  const docUrl = getDocumentURL(
    post.record,
    post.uri,
    post.publication ?? undefined,
  );
  const authorLabel =
    post.author?.displayName ||
    (post.author?.handle ? `@${post.author.handle}` : undefined);
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
      ? blobRefToSrc(post.record.coverImage.ref, postDid)
      : undefined;

  const { rootEntity } = useReplicache();
  const pageWidth = useEntity(rootEntity, "theme/page-width")?.data.value;

  const publicationPrefs = post.publication?.record?.preferences;
  const showComments = publicationPrefs?.showComments !== false;
  const showMentions = publicationPrefs?.showMentions !== false;
  const showRecommends = publicationPrefs?.showRecommends !== false;
  const commentsCount = showComments ? post.commentsCount : 0;

  const interactions = (
    <InteractionPreview
      quotesCount={post.mentionsCount}
      commentsCount={commentsCount}
      recommendsCount={post.recommendsCount}
      documentUri={post.uri}
      tags={post.record.tags || []}
      postUrl={docUrl}
      showComments={showComments}
      showMentions={showMentions}
      showRecommends={showRecommends}
    />
  );

  const commonProps = {
    href: docUrl,
    title: post.record.title,
    author: authorLabel,
    date,
    interactions,
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
