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

  if (isLoading) {
    return (
      <div className="flex w-full grow flex-col">
        <div className="flex flex-col gap-2">
          <div className="h-5 w-2/3 bg-border-light rounded animate-pulse" />
          <div className="h-4 w-full bg-border-light rounded animate-pulse" />
        </div>
        <div className="pt-2">
          <div className="h-3 w-24 bg-border-light rounded animate-pulse" />
        </div>
      </div>
    );
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

  const commonProps = {
    href: docUrl,
    title: post.record.title,
    author: authorLabel,
    date,
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
