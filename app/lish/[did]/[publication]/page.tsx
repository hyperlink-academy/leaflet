import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import { getPublicationURL, getDocumentURL } from "app/lish/createPub/getPublicationURL";
import { BskyAgent } from "@atproto/api";
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import { SubscribeWithBluesky } from "app/lish/Subscribe";
import React from "react";
import {
  PublicationBackgroundProvider,
  PublicationThemeProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { SpeedyLink } from "components/SpeedyLink";
import { InteractionPreview } from "components/InteractionsPreview";
import { LocalizedDate } from "./LocalizedDate";
import { PublicationHomeLayout } from "./PublicationHomeLayout";
import { PublicationAuthor } from "./PublicationAuthor";
import { Separator } from "components/Layout";
import {
  normalizePublicationRecord,
  normalizeDocumentRecord,
} from "src/utils/normalizeRecords";

export default async function Publication(props: {
  params: Promise<{ publication: string; did: string }>;
}) {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  if (!did) return <PubNotFound />;
  let agent = new BskyAgent({ service: "https://public.api.bsky.app" });
  let publication_name = decodeURIComponent(params.publication);
  let [{ data: publications }, { data: profile }] = await Promise.all([
    supabaseServerClient
      .from("publications")
      .select(
        `*,
        publication_subscriptions(*),
        documents_in_publications(documents(
          *,
          comments_on_documents(count),
          document_mentions_in_bsky(count),
          recommends_on_documents(count)
        ))
      `,
      )
      .eq("identity_did", did)
      .or(publicationNameOrUriFilter(did, publication_name))
      .order("uri", { ascending: false })
      .limit(1),
    agent.getProfile({ actor: did }),
  ]);
  let publication = publications?.[0];

  const record = normalizePublicationRecord(publication?.record);

  let showPageBackground = record?.theme?.showPageBackground;

  if (!publication) return <PubNotFound />;
  try {
    return (
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
            <div className="pubHeader flex flex-col pb-8 w-full text-center justify-center ">
              {record?.icon && (
                <div
                  className="shrink-0 w-10 h-10 rounded-full mx-auto"
                  style={{
                    backgroundImage: `url(/api/atproto_images?did=${did}&cid=${(record.icon.ref as unknown as { $link: string })["$link"]})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                  }}
                />
              )}
              <h2 className="text-accent-contrast sm:text-xl text-[22px] pt-1 ">
                {publication.name}
              </h2>
              <p className="sm:text-lg text-secondary">
                {record?.description}{" "}
              </p>
              {profile && (
                <PublicationAuthor
                  did={profile.did}
                  displayName={profile.displayName}
                  handle={profile.handle}
                />
              )}
              <div className="sm:pt-4 pt-4">
                <SubscribeWithBluesky
                  base_url={getPublicationURL(publication)}
                  pubName={publication.name}
                  pub_uri={publication.uri}
                  subscribers={publication.publication_subscriptions}
                />
              </div>
            </div>
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

                  const docUrl = getDocumentURL(doc_record, doc.documents.uri, publication);
                  return (
                    <React.Fragment key={doc.documents?.uri}>
                      <div className="flex w-full grow flex-col ">
                        <SpeedyLink
                          href={docUrl}
                          className="publishedPost hover:no-underline! flex flex-col"
                        >
                          <h3 className="text-primary">{doc_record.title}</h3>
                          <p className="italic text-secondary">
                            {doc_record.description}
                          </p>
                        </SpeedyLink>

                        <div className="justify-between w-full text-sm text-tertiary flex gap-1 flex-wrap pt-2 items-center">
                          <p className="text-sm text-tertiary ">
                            {doc_record.publishedAt && (
                              <LocalizedDate
                                dateString={doc_record.publishedAt}
                                options={{
                                  year: "numeric",
                                  month: "long",
                                  day: "2-digit",
                                }}
                              />
                            )}{" "}
                          </p>

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
                        </div>
                      </div>
                      <hr className="last:hidden border-border-light" />
                    </React.Fragment>
                  );
                })}
            </div>
          </PublicationHomeLayout>
        </PublicationBackgroundProvider>
      </PublicationThemeProvider>
    );
  } catch (e) {
    console.log(e);
    return <pre>{JSON.stringify(e, undefined, 2)}</pre>;
  }
}

const PubNotFound = () => {
  return (
    <NotFoundLayout>
      <p className="font-bold">Sorry, we can't find this publication!</p>
      <p>
        This may be a glitch on our end. If the issue persists please{" "}
        <a href="mailto:contact@leaflet.pub">send us a note</a>.
      </p>
    </NotFoundLayout>
  );
};
