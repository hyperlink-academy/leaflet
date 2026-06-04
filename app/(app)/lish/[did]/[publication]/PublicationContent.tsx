import React from "react";
import { PublicationHomeLayout } from "./PublicationHomeLayout";
import { PublicationAuthor } from "./PublicationAuthor";
import {
  normalizePublicationRecord,
  normalizeDocumentRecord,
} from "src/utils/normalizeRecords";
import { FontLoader } from "components/FontLoader";
import { SpeedyLink } from "components/SpeedyLink";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { getPublicationURL } from "app/(app)/lish/createPub/getPublicationURL";
import { SubscribeInput } from "components/Subscribe/SubscribeButton";
import {
  PublicationPostsList,
  type PublicationPostsListPost,
  type PublicationPostsListFakePost,
} from "./PublicationPostsList";

type FakePost = PublicationPostsListFakePost;

export const PublicationContent = ({
  record,
  publication,
  did,
  profile,
  showPageBackground,
  fakePosts,
}: {
  record: ReturnType<typeof normalizePublicationRecord>;
  publication: {
    uri: string;
    name: string;
    identity_did: string;
    record: unknown;
    publication_subscriptions: { identity: string }[];
    publication_newsletter_settings: { enabled: boolean } | null;
    publication_pages?: {
      id: number;
      path: string | null;
      title: string | null;
      record_uri: string | null;
      sort_order: string;
    }[];
    documents_in_publications: {
      documents: {
        uri: string;
        data: unknown;
        comments_on_documents: { count: number }[];
        document_mentions_in_bsky: { count: number }[];
        recommends_on_documents: { count: number }[];
      } | null;
    }[];
  };
  did: string;
  profile: { did: string; displayName?: string; handle: string } | undefined;
  showPageBackground: boolean | undefined;
  fakePosts?: FakePost[];
}) => {
  const newsletterMode = !!publication.publication_newsletter_settings?.enabled;
  const navPages = (publication.publication_pages ?? []).filter(
    (p) => p.record_uri,
  );
  const posts: PublicationPostsListPost[] = fakePosts
    ? []
    : publication.documents_in_publications
        .map((dip) => {
          if (!dip.documents) return null;
          const normalized = normalizeDocumentRecord(dip.documents.data);
          if (!normalized) return null;
          return {
            uri: dip.documents.uri,
            record: normalized,
            commentsCount: dip.documents.comments_on_documents[0]?.count || 0,
            mentionsCount:
              dip.documents.document_mentions_in_bsky[0]?.count || 0,
            recommendsCount:
              dip.documents.recommends_on_documents?.[0]?.count || 0,
          };
        })
        .filter((p): p is PublicationPostsListPost => p !== null);
  return (
    <>
      <FontLoader
        headingFontId={record?.theme?.headingFont}
        bodyFontId={record?.theme?.bodyFont}
      />
      <PublicationHomeLayout
        uri={publication.uri}
        showPageBackground={!!showPageBackground}
        iconUrl={record?.icon ? blobRefToSrc(record.icon.ref, did) : undefined}
        publicationName={publication.name}
        description={record?.description}
        navPages={navPages}
        publicationUrl={getPublicationURL(publication)}
        activePath="/"
        subscribe={{
          publicationUri: publication.uri,
          publicationUrl: record?.url,
          publicationName: record?.name ?? publication.name,
          publicationDescription: record?.description,
          newsletterMode,
        }}
        author={
          profile ? (
            <PublicationAuthor
              did={profile.did}
              displayName={profile.displayName}
              handle={profile.handle}
            />
          ) : undefined
        }
        subscribeButton={
          <div className="max-w-sm mx-auto">
            <SubscribeInput
              publicationUri={publication.uri}
              publicationUrl={record?.url}
              publicationName={record?.name ?? publication.name}
              publicationDescription={record?.description}
              newsletterMode={newsletterMode}
            />
          </div>
        }
      >
        <PublicationPostsList
          publication={publication}
          publicationRecord={record}
          posts={posts}
          fakePosts={fakePosts}
          className="px-3 sm:px-4"
        />
      </PublicationHomeLayout>
    </>
  );
};

export function PublicationPostItem(props: {
  href?: string;
  title?: string;
  description?: string;
  author?: React.ReactNode;
  date?: React.ReactNode;
  interactions?: React.ReactNode;
}) {
  const content = (
    <>
      {props.title && <h3 className="text-primary">{props.title}</h3>}
      <p className="italic text-secondary line-clamp-3">{props.description}</p>
    </>
  );

  const hasAuthor = props.author !== undefined && props.author !== null;
  const hasDate = props.date !== undefined && props.date !== null;

  return (
    <>
      <div className="flex w-full grow flex-col ">
        {props.href ? (
          <SpeedyLink
            href={props.href}
            className="publishedPost no-underline! flex flex-col"
          >
            {content}
          </SpeedyLink>
        ) : (
          <div className="publishedPost no-underline! flex flex-col">
            {content}
          </div>
        )}

        <div className="justify-between w-full text-sm text-tertiary flex gap-1 flex-wrap pt-2 items-center">
          <p className="text-sm text-tertiary flex gap-1 items-center">
            {hasAuthor && <span>{props.author}</span>}
            {hasAuthor && hasDate && <span>|</span>}
            {hasDate && <span>{props.date}</span>}
          </p>
          {props.interactions}
        </div>
      </div>
      <hr className="last:hidden border-border-light" />
    </>
  );
}
