import React from "react";
import { AtUri } from "@atproto/syntax";
import {
  getPublicationURL,
  getDocumentURL,
} from "app/lish/createPub/getPublicationURL";
import { SubscribeWithBluesky } from "app/lish/Subscribe";
import {
  PublicationBackgroundProvider,
  PublicationThemeProvider,
} from "components/ThemeManager/PublicationThemeProvider";
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
import {
  PublicationHeader,
  PublicationPostItem,
} from "./PublicationPageContent";

export const PublicationContent = ({
  record,
  publication,
  did,
  profile,
  showPageBackground,
}: {
  record: ReturnType<typeof normalizePublicationRecord>;
  publication: {
    uri: string;
    name: string;
    identity_did: string;
    record: unknown;
    publication_subscriptions: { identity: string }[];
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
}) => {
  return (
    <>
      <FontLoader
        headingFontId={record?.theme?.headingFont}
        bodyFontId={record?.theme?.bodyFont}
      />
      <PublicationThemeProvider
        theme={record?.theme}
        pub_creator={publication.identity_did}
      >
        <PublicationBackgroundProvider
          theme={record?.theme}
          pub_creator={publication.identity_did}
        >
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
                <SubscribeWithBluesky
                  base_url={getPublicationURL(publication)}
                  pubName={publication.name}
                  pub_uri={publication.uri}
                  subscribers={publication.publication_subscriptions}
                />
              }
            />
            <div className="publicationPostList w-full flex flex-col gap-4">
              {publication.documents_in_publications
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
                  const doc_record = normalizeDocumentRecord(
                    doc.documents.data,
                  );
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
                          doc_record.description ||
                          getFirstParagraph(doc_record)
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
        </PublicationBackgroundProvider>
      </PublicationThemeProvider>
    </>
  );
};
