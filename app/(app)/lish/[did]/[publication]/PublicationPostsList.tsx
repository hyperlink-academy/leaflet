import React from "react";
import { AtUri } from "@atproto/api";
import { getDocumentURL } from "app/(app)/lish/createPub/getPublicationURL";
import { InteractionPreview } from "components/InteractionsPreview";
import { LocalizedDate } from "./LocalizedDate";
import { PublicationPostItem } from "./PublicationContent";
import {
  PublicationPostItemSmall,
  PublicationPostItemMedium,
  PublicationPostItemLarge,
} from "./PublicationPostItem";
import {
  normalizeDocumentRecord,
  type NormalizedDocument,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";
import { getFirstParagraph } from "src/utils/getFirstParagraph";
import { blobRefToSrc, COVER_THUMBNAIL_WIDTH } from "src/utils/blobRefToSrc";
import { PostByline } from "components/PostByline";
import { namedBylineProfiles, type BylineProfile } from "src/utils/byline";

export type PublicationPostsListPost = {
  uri: string;
  record: NormalizedDocument;
  commentsCount: number;
  mentionsCount: number;
  recommendsCount: number;
  // Resolved byline profiles for posts with an explicit byline (co-authors /
  // guest authors). Empty/undefined for single-author posts, which omit the
  // byline. Populated server-side via `withBylineProfiles`.
  contributors?: BylineProfile[];
};

/**
 * Builds the post list for a publication home page from its joined
 * `documents_in_publications` rows: normalizes each document record and pulls
 * the comment / mention / recommend counts, dropping rows that can't be
 * normalized. Shared by every publication-home render path (custom page,
 * legacy fallback, theme preview) so they stay in sync. Wrap the result in
 * `withBylineProfiles` to enrich it with contributor profiles.
 */
export function buildPublicationPosts(
  documentsInPublications:
    | Array<{
        documents: {
          uri: string;
          data: unknown;
          comments_on_documents?: { count: number }[] | null;
          document_mentions_in_bsky?: { count: number }[] | null;
          recommends_on_documents?: { count: number }[] | null;
        } | null;
      }>
    | null
    | undefined,
): PublicationPostsListPost[] {
  return (documentsInPublications ?? [])
    .map((dip) => {
      if (!dip.documents) return null;
      const normalized = normalizeDocumentRecord(
        dip.documents.data,
        dip.documents.uri,
      );
      if (!normalized) return null;
      return {
        uri: dip.documents.uri,
        record: normalized,
        commentsCount: dip.documents.comments_on_documents?.[0]?.count || 0,
        mentionsCount: dip.documents.document_mentions_in_bsky?.[0]?.count || 0,
        recommendsCount: dip.documents.recommends_on_documents?.[0]?.count || 0,
      };
    })
    .filter((p): p is PublicationPostsListPost => p !== null);
}

export type PublicationPostsListFakePost = {
  title: string;
  description: string;
  date: React.ReactNode;
};

type PublicationForURL = {
  uri: string;
  record: unknown;
};

type PublicationPostsListView = "small" | "medium";

export function PublicationPostsList({
  publication,
  publicationRecord,
  posts,
  fakePosts,
  view = "medium",
  highlightFirstPost = false,
  className,
}: {
  publication: PublicationForURL;
  publicationRecord: NormalizedPublication | null;
  posts?: PublicationPostsListPost[];
  fakePosts?: PublicationPostsListFakePost[];
  view?: PublicationPostsListView;
  highlightFirstPost?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`publicationPostList w-full flex flex-col gap-2 ${className}`}
    >
      {fakePosts
        ? fakePosts.map((post, i) => (
            <PublicationPostItem
              key={i}
              title={post.title}
              description={post.description}
              date={post.date}
            />
          ))
        : posts
            ?.slice()
            .sort((a, b) => {
              const aDate = a.record.publishedAt
                ? new Date(a.record.publishedAt)
                : new Date(0);
              const bDate = b.record.publishedAt
                ? new Date(b.record.publishedAt)
                : new Date(0);
              return bDate.getTime() - aDate.getTime();
            })
            .map((post, index) => {
              const doc_record = post.record;
              const quotes = post.mentionsCount;
              const comments =
                publicationRecord?.preferences?.showComments === false
                  ? 0
                  : post.commentsCount;
              const recommends = post.recommendsCount;
              const tags = doc_record.tags || [];

              const docUrl = getDocumentURL(doc_record, post.uri, publication);
              const date = doc_record.publishedAt ? (
                <LocalizedDate
                  dateString={doc_record.publishedAt}
                  options={{
                    year: "numeric",
                    month: "long",
                    day: "2-digit",
                  }}
                />
              ) : undefined;
              const interactions = (
                <InteractionPreview
                  quotesCount={quotes}
                  commentsCount={comments}
                  recommendsCount={recommends}
                  documentUri={post.uri}
                  tags={tags}
                  postUrl={docUrl}
                  title={doc_record.title}
                  showComments={
                    publicationRecord?.preferences?.showComments !== false
                  }
                  showMentions={
                    publicationRecord?.preferences?.showMentions !== false
                  }
                  showRecommends={
                    publicationRecord?.preferences?.showRecommends !== false
                  }
                />
              );

              // Only render a byline when contributors resolve to a real name.
              // Pass `undefined` (not an empty node) otherwise so MetaRow
              // doesn't draw an orphan separator before the date.
              const namedContributors = namedBylineProfiles(post.contributors);
              const author =
                namedContributors.length > 0 ? (
                  <PostByline contributors={namedContributors} />
                ) : undefined;

              const isHighlightedFirst = highlightFirstPost && index === 0;
              const Variant = isHighlightedFirst
                ? "large"
                : view === "small"
                  ? "small"
                  : "medium";

              const postDid = new AtUri(post.uri).host;
              // Request a downscaled thumbnail (via Supabase image transform)
              // sized for how the cover image is displayed in each variant,
              // rather than shipping the full-resolution blob.
              const coverImageSrc = doc_record.coverImage
                ? blobRefToSrc(doc_record.coverImage.ref, postDid, undefined, {
                    width:
                      Variant === "large"
                        ? COVER_THUMBNAIL_WIDTH.large
                        : COVER_THUMBNAIL_WIDTH.medium,
                  })
                : undefined;

              if (Variant === "large") {
                return (
                  <React.Fragment key={post.uri}>
                    <PublicationPostItemLarge
                      inList
                      href={docUrl}
                      title={doc_record.title}
                      description={
                        doc_record.description || getFirstParagraph(doc_record)
                      }
                      author={author}
                      date={date}
                      interactions={interactions}
                      coverImageSrc={coverImageSrc}
                      coverImageAlt={doc_record.title}
                      pageWidth={publicationRecord?.theme?.pageWidth}
                    />
                    <hr className="last:hidden border-border-light" />
                  </React.Fragment>
                );
              }

              if (Variant === "small") {
                return (
                  <React.Fragment key={post.uri}>
                    <PublicationPostItemSmall
                      inList
                      href={docUrl}
                      title={doc_record.title}
                      author={author}
                      date={date}
                      interactions={interactions}
                    />
                    <hr className="last:hidden border-border-light" />
                  </React.Fragment>
                );
              }

              return (
                <React.Fragment key={post.uri}>
                  <PublicationPostItemMedium
                    inList
                    href={docUrl}
                    title={doc_record.title}
                    description={
                      doc_record.description || getFirstParagraph(doc_record)
                    }
                    author={author}
                    date={date}
                    interactions={interactions}
                    coverImageSrc={coverImageSrc}
                    coverImageAlt={doc_record.title}
                  />
                  <hr className="last:hidden border-border-light mx-3" />
                </React.Fragment>
              );
            })}
    </div>
  );
}
