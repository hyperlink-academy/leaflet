"use client";

import React, { useMemo } from "react";
import { AtUri } from "@atproto/api";
import { getDocumentURL } from "app/(app)/lish/createPub/getPublicationURL";
import { InteractionPreview } from "components/InteractionsPreview";
import { LocalizedDate } from "./LocalizedDate";
import { PublicationPostItem } from "./DefaultPublicationHomepage";
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
import { blobRefToSrc, COVER_THUMBNAIL_WIDTH } from "src/utils/blobRefToSrc";
import { useContributorProfiles } from "src/hooks/useContributorProfiles";
import {
  getBylineDids,
  toBylineProfiles,
  formatBylineProfiles,
  type BylineProfile,
} from "src/utils/byline";

// The author DID for a post is the host of its document AT-URI.
function postOwnerDid(uri: string): string | null {
  try {
    return new AtUri(uri).host;
  } catch {
    return null;
  }
}

export type PublicationPostsListPost = {
  uri: string;
  record: NormalizedDocument;
  commentsCount: number;
  mentionsCount: number;
  recommendsCount: number;
  // Byline profiles resolved server-side (in order). When present, the list
  // renders these directly; when absent (editor / theme preview) the component
  // resolves them on the client via useContributorProfiles.
  bylineProfiles?: BylineProfile[];
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

export type PublicationPostsListView = "small" | "medium";

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
  // Resolve a byline name per post: the post's explicit contributors when
  // present, otherwise the document author (publication owner). Server render
  // paths attach `bylineProfiles` so they appear in the initial HTML; for any
  // post without them (editor / theme preview) we resolve client-side here,
  // batched into a single get_profiles lookup keyed on the full DID set.
  const unresolvedDids = useMemo(() => {
    const dids = new Set<string>();
    for (const post of posts ?? []) {
      if (post.bylineProfiles) continue;
      const owner = postOwnerDid(post.uri);
      if (!owner) continue;
      for (const did of getBylineDids(post.record, owner)) dids.add(did);
    }
    return Array.from(dids);
  }, [posts]);
  const { data: profilesRecord } = useContributorProfiles(unresolvedDids);
  const authorByUri = useMemo(() => {
    const profiles = new Map(Object.entries(profilesRecord ?? {}));
    const map = new Map<string, string | undefined>();
    for (const post of posts ?? []) {
      let byline = post.bylineProfiles;
      if (!byline) {
        const owner = postOwnerDid(post.uri);
        byline = owner
          ? toBylineProfiles(getBylineDids(post.record, owner), profiles)
          : [];
      }
      map.set(post.uri, formatBylineProfiles(byline));
    }
    return map;
  }, [posts, profilesRecord]);

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
                      author={authorByUri.get(post.uri)}
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
                      author={authorByUri.get(post.uri)}
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
                    author={authorByUri.get(post.uri)}
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
