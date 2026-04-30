import React from "react";
import { AtUri } from "@atproto/syntax";
import { getDocumentURL } from "app/lish/createPub/getPublicationURL";
import { InteractionPreview } from "components/InteractionsPreview";
import { LocalizedDate } from "./LocalizedDate";
import { PublicationHomeLayout } from "./PublicationHomeLayout";
import { PublicationAuthor } from "./PublicationAuthor";
import {
  normalizePublicationRecord,
  normalizeDocumentRecord,
} from "src/utils/normalizeRecords";
import { getFirstParagraph } from "src/utils/getFirstParagraph";
import { FontLoader } from "components/FontLoader";
import { SpeedyLink } from "components/SpeedyLink";
import { SubscribeInput } from "components/Subscribe/SubscribeButton";

type FakePost = {
  title: string;
  description: string;
  date: React.ReactNode;
};

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
  return (
    <>
      <FontLoader
        headingFontId={record?.theme?.headingFont}
        bodyFontId={record?.theme?.bodyFont}
      />
      <PublicationHomeLayout
        uri={publication.uri}
        showPageBackground={!!showPageBackground}
      >
        <PublicationHeader
          iconUrl={
            record?.icon
              ? `/api/atproto_images?did=${did}&cid=${(record.icon.ref as unknown as { $link: string })["$link"]}`
              : undefined
          }
          publicationName={publication.name}
          description={record?.description}
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
        />
        <div className="publicationPostList w-full flex flex-col gap-4">
          {fakePosts &&
            fakePosts.map((post, i) => (
              <PublicationPostItem
                key={i}
                title={post.title}
                description={post.description}
                date={post.date}
              />
            ))}
          {!fakePosts &&
            publication.documents_in_publications
              .filter((d) => !!d?.documents)
              .sort((a, b) => {
                const aRecord = normalizeDocumentRecord(a.documents?.data);
                const bRecord = normalizeDocumentRecord(b.documents?.data);
                const aDate = aRecord?.publishedAt
                  ? new Date(aRecord.publishedAt)
                  : new Date(0);
                const bDate = bRecord?.publishedAt
                  ? new Date(bRecord.publishedAt)
                  : new Date(0);
                return bDate.getTime() - aDate.getTime(); // Sort by most recent first
              })
              .map((doc) => {
                if (!doc.documents) return null;
                const doc_record = normalizeDocumentRecord(doc.documents.data);
                if (!doc_record) return null;
                let uri = new AtUri(doc.documents.uri);
                let quotes =
                  doc.documents.document_mentions_in_bsky[0].count || 0;
                let comments =
                  record?.preferences?.showComments === false
                    ? 0
                    : doc.documents.comments_on_documents[0].count || 0;
                let recommends =
                  doc.documents.recommends_on_documents?.[0]?.count || 0;
                let tags = doc_record.tags || [];

                const docUrl = getDocumentURL(
                  doc_record,
                  doc.documents.uri,
                  publication,
                );
                return (
                  <React.Fragment key={doc.documents?.uri}>
                    <PublicationPostItem
                      href={docUrl}
                      title={doc_record.title}
                      description={
                        doc_record.description || getFirstParagraph(doc_record)
                      }
                      date={
                        doc_record.publishedAt ? (
                          <LocalizedDate
                            dateString={doc_record.publishedAt}
                            options={{
                              year: "numeric",
                              month: "long",
                              day: "2-digit",
                            }}
                          />
                        ) : undefined
                      }
                      interactions={
                        <InteractionPreview
                          quotesCount={quotes}
                          commentsCount={comments}
                          recommendsCount={recommends}
                          documentUri={doc.documents.uri}
                          tags={tags}
                          postUrl={docUrl}
                          showComments={
                            record?.preferences?.showComments !== false
                          }
                          showMentions={
                            record?.preferences?.showMentions !== false
                          }
                          showRecommends={
                            record?.preferences?.showRecommends !== false
                          }
                        />
                      }
                    />
                  </React.Fragment>
                );
              })}
        </div>
      </PublicationHomeLayout>
    </>
  );
};

export function PublicationHeader(props: {
  iconUrl?: string;
  publicationName: string;
  description?: string;
  author?: React.ReactNode;
  subscribeButton?: React.ReactNode;
}) {
  return (
    <div className="pubHeader flex flex-col pb-8 w-full text-center justify-center ">
      {props.iconUrl && (
        <div
          className="shrink-0 w-10 h-10 rounded-full mx-auto"
          style={{
            backgroundImage: `url(${props.iconUrl})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        />
      )}
      <h2 className="text-accent-contrast sm:text-xl text-[22px] pt-1 ">
        {props.publicationName}
      </h2>
      <p className="sm:text-lg text-secondary">{props.description} </p>
      {props.author}
      <div className="sm:pt-4 pt-4">{props.subscribeButton}</div>
    </div>
  );
}

export function PublicationPostItem(props: {
  href?: string;
  title?: string;
  description?: string;
  date?: React.ReactNode;
  interactions?: React.ReactNode;
}) {
  const content = (
    <>
      {props.title && <h3 className="text-primary">{props.title}</h3>}
      <p className="italic text-secondary line-clamp-3">{props.description}</p>
    </>
  );

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
          <p className="text-sm text-tertiary ">{props.date} </p>
          {props.interactions}
        </div>
      </div>
      <hr className="last:hidden border-border-light" />
    </>
  );
}
