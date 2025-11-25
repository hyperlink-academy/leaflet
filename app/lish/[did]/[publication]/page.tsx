import { supabaseServerClient } from "supabase/serverClient";
import { AtUri } from "@atproto/syntax";
import { PubLeafletDocument, PubLeafletPublication } from "lexicons/api";
import Link from "next/link";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { BskyAgent } from "@atproto/api";
import { SubscribeWithBluesky } from "app/lish/Subscribe";
import React from "react";
import {
  PublicationBackgroundProvider,
  PublicationThemeProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { SpeedyLink } from "components/SpeedyLink";
import { QuoteTiny } from "components/Icons/QuoteTiny";
import { CommentTiny } from "components/Icons/CommentTiny";
import { LocalizedDate } from "./LocalizedDate";
import { PublicationHomeLayout } from "./PublicationHomeLayout";
import { PubNotFound } from "./PubNotFound";

export default async function Publication(props: {
  params: Promise<{ publication: string; did: string }>;
}) {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  if (!did) return <PubNotFound />;
  let agent = new BskyAgent({ service: "https://public.api.bsky.app" });
  let uri;
  let publication_name = decodeURIComponent(params.publication);
  if (/^(?!\.$|\.\.S)[A-Za-z0-9._:~-]{1,512}$/.test(publication_name)) {
    uri = AtUri.make(
      did,
      "pub.leaflet.publication",
      publication_name,
    ).toString();
  }
  let [{ data: publication }, { data: profile }] = await Promise.all([
    supabaseServerClient
      .from("publications")
      .select(
        `*,
        publication_subscriptions(*),
        documents_in_publications(documents(
          *,
          comments_on_documents(count),
          document_mentions_in_bsky(count)
        ))
      `,
      )
      .eq("identity_did", did)
      .or(`name.eq."${publication_name}", uri.eq."${uri}"`)
      .single(),
    agent.getProfile({ actor: did }),
  ]);

  let record = publication?.record as PubLeafletPublication.Record | null;

  let showPageBackground = record?.theme?.showPageBackground;

  if (!publication) return <PubNotFound />;
  try {
    return (
      <PublicationThemeProvider
        record={record}
        pub_creator={publication.identity_did}
      >
        <PublicationBackgroundProvider
          record={record}
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
                <p className="italic text-tertiary sm:text-base text-sm">
                  <strong className="">by {profile.displayName}</strong>{" "}
                  <a
                    className="text-tertiary"
                    href={`https://bsky.app/profile/${profile.handle}`}
                  >
                    @{profile.handle}
                  </a>
                </p>
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
                  let aRecord = a.documents?.data! as PubLeafletDocument.Record;
                  let bRecord = b.documents?.data! as PubLeafletDocument.Record;
                  const aDate = aRecord.publishedAt
                    ? new Date(aRecord.publishedAt)
                    : new Date(0);
                  const bDate = bRecord.publishedAt
                    ? new Date(bRecord.publishedAt)
                    : new Date(0);
                  return bDate.getTime() - aDate.getTime(); // Sort by most recent first
                })
                .map((doc) => {
                  if (!doc.documents) return null;
                  let uri = new AtUri(doc.documents.uri);
                  let doc_record = doc.documents
                    .data as PubLeafletDocument.Record;
                  let quotes =
                    doc.documents.document_mentions_in_bsky[0].count || 0;
                  let comments =
                    record?.preferences?.showComments === false
                      ? 0
                      : doc.documents.comments_on_documents[0].count || 0;

                  return (
                    <React.Fragment key={doc.documents?.uri}>
                      <div className="flex w-full grow flex-col ">
                        <SpeedyLink
                          href={`${getPublicationURL(publication)}/${uri.rkey}`}
                          className="publishedPost hover:no-underline! flex flex-col"
                        >
                          <h3 className="text-primary">{doc_record.title}</h3>
                          <p className="italic text-secondary">
                            {doc_record.description}
                          </p>
                        </SpeedyLink>

                        <div className="text-sm text-tertiary flex gap-1 flex-wrap pt-2">
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
                          {comments > 0 || quotes > 0 ? "| " : ""}
                          {quotes > 0 && (
                            <SpeedyLink
                              href={`${getPublicationURL(publication)}/${uri.rkey}?interactionDrawer=quotes`}
                              className="flex flex-row gap-0 text-sm text-tertiary items-center flex-wrap"
                            >
                              <QuoteTiny /> {quotes}
                            </SpeedyLink>
                          )}
                          {comments > 0 &&
                            record?.preferences?.showComments !== false && (
                              <SpeedyLink
                                href={`${getPublicationURL(publication)}/${uri.rkey}?interactionDrawer=comments`}
                                className="flex flex-row gap-0 text-sm text-tertiary items-center flex-wrap"
                              >
                                <CommentTiny /> {comments}
                              </SpeedyLink>
                            )}
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
