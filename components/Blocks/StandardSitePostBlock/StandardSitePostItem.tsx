"use client";
import { PublicationPostItem } from "app/lish/[did]/[publication]/PublicationContent";
import { LocalizedDate } from "app/lish/[did]/[publication]/LocalizedDate";
import { getDocumentURL } from "app/lish/createPub/getPublicationURL";
import { getFirstParagraph } from "src/utils/getFirstParagraph";
import { useStandardSitePost } from "components/StandardSitePostDataProvider";
import type { StandardSitePostData } from "app/api/rpc/[command]/get_standard_site_posts";

export function StandardSitePostItem({ uri }: { uri: string }) {
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

  return <StandardSitePostItemView post={data} />;
}

export function StandardSitePostItemView({
  post,
}: {
  post: StandardSitePostData;
}) {
  const docUrl = getDocumentURL(
    post.record,
    post.uri,
    post.publication ?? undefined,
  );
  const authorLabel =
    post.author?.displayName ||
    (post.author?.handle ? `@${post.author.handle}` : undefined);

  return (
    <PublicationPostItem
      href={docUrl}
      title={post.record.title}
      description={post.record.description || getFirstParagraph(post.record)}
      author={authorLabel}
      date={
        post.record.publishedAt ? (
          <LocalizedDate
            dateString={post.record.publishedAt}
            options={{ year: "numeric", month: "long", day: "2-digit" }}
          />
        ) : undefined
      }
    />
  );
}
