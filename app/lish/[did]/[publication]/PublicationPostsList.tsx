import React from "react";
import { AtUri } from "@atproto/api";
import { getDocumentURL } from "app/lish/createPub/getPublicationURL";
import { InteractionPreview } from "components/InteractionsPreview";
import { LocalizedDate } from "./LocalizedDate";
import { PublicationPostItem } from "./PublicationContent";
import {
  PublicationPostItemSmall,
  PublicationPostItemMedium,
  PublicationPostItemLarge,
} from "./PublicationPostItem";
import {
  type NormalizedDocument,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";
import { getFirstParagraph } from "src/utils/getFirstParagraph";
import { blobRefToSrc } from "src/utils/blobRefToSrc";

export type PublicationPostsListPost = {
  uri: string;
  record: NormalizedDocument;
  commentsCount: number;
  mentionsCount: number;
  recommendsCount: number;
};

export type PublicationPostsListFakePost = {
  title: string;
  description: string;
  date: React.ReactNode;
};

type PublicationForURL = {
  uri: string;
  record: unknown;
};

export type PublicationPostsListView = "compact" | "full";

export function PublicationPostsList({
  publication,
  publicationRecord,
  posts,
  fakePosts,
  view = "full",
  highlightFirstPost = false,
}: {
  publication: PublicationForURL;
  publicationRecord: NormalizedPublication | null;
  posts?: PublicationPostsListPost[];
  fakePosts?: PublicationPostsListFakePost[];
  view?: PublicationPostsListView;
  highlightFirstPost?: boolean;
}) {
  return (
    <div className="publicationPostList w-full flex flex-col gap-4">
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

              const isHighlightedFirst = highlightFirstPost && index === 0;
              const Variant = isHighlightedFirst
                ? "large"
                : view === "compact"
                  ? "small"
                  : "medium";

              if (Variant === "large") {
                const postDid = new AtUri(post.uri).host;
                const coverImageSrc = doc_record.coverImage
                  ? blobRefToSrc(doc_record.coverImage.ref, postDid)
                  : undefined;
                return (
                  <PublicationPostItemLarge
                    key={post.uri}
                    href={docUrl}
                    title={doc_record.title}
                    description={
                      doc_record.description || getFirstParagraph(doc_record)
                    }
                    date={date}
                    interactions={interactions}
                    coverImageSrc={coverImageSrc}
                    coverImageAlt={doc_record.title}
                  />
                );
              }

              if (Variant === "small") {
                return (
                  <PublicationPostItemSmall
                    key={post.uri}
                    href={docUrl}
                    title={doc_record.title}
                    date={date}
                    interactions={interactions}
                  />
                );
              }

              return (
                <PublicationPostItemMedium
                  key={post.uri}
                  href={docUrl}
                  title={doc_record.title}
                  description={
                    doc_record.description || getFirstParagraph(doc_record)
                  }
                  date={date}
                  interactions={interactions}
                />
              );
            })}
    </div>
  );
}
