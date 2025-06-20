import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";

import { ThemeProvider } from "components/ThemeManager/ThemeProvider";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { AtUri } from "@atproto/syntax";
import { PubLeafletDocument, PubLeafletPublication } from "lexicons/api";
import Link from "next/link";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { BskyAgent } from "@atproto/api";
import { SubscribeWithBluesky } from "app/lish/Subscribe";
import React from "react";
import { PublicationThemeProvider } from "components/ThemeManager/PublicationThemeProvider";

export async function generateMetadata(props: {
  params: Promise<{ publication: string; did: string }>;
}): Promise<Metadata> {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  if (!did) return { title: "Publication 404" };

  let { result: publication } = await get_publication_data.handler(
    {
      did,
      publication_name: decodeURIComponent(params.publication),
    },
    { supabase: supabaseServerClient },
  );
  if (!publication) return { title: "404 Publication" };

  let record = publication.record as PubLeafletPublication.Record | null;
  return {
    title: decodeURIComponent(params.publication),
    description: record?.description || "",
  };
}

export default async function Publication(props: {
  params: Promise<{ publication: string; did: string }>;
}) {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  if (!did) return <PubNotFound />;
  let agent = new BskyAgent({ service: "https://public.api.bsky.app" });
  let [{ data: publication }, { data: profile }] = await Promise.all([
    supabaseServerClient
      .from("publications")
      .select(
        `*,
        publication_subscriptions(*),
      documents_in_publications(documents(*))
      `,
      )
      .eq("identity_did", did)
      .eq("name", decodeURIComponent(params.publication))
      .single(),
    agent.getProfile({ actor: did }),
  ]);

  let record = publication?.record as PubLeafletPublication.Record | null;

  if (!publication) return <PubNotFound />;
  try {
    return (
      <PublicationThemeProvider record={record}>
        <div className="publicationWrapper w-screen  h-full min-h-fit flex place-items-center bg-[#FDFCFA]">
          <div className="publication max-w-prose w-full mx-auto h-full sm:pt-8 pt-4 px-3 pb-12 sm:pb-8">
            <div className="flex flex-col pb-8 w-full text-center justify-center ">
              <div className="flex flex-col gap-3 justify-center place-items-center">
                {record?.icon && (
                  <div
                    className="shrink-0 w-10 h-10 rounded-full"
                    style={{
                      backgroundImage: `url(/api/atproto_images?did=${did}&cid=${(record.icon.ref as unknown as { $link: string })["$link"]})`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                      backgroundSize: "cover",
                    }}
                  />
                )}
                <h2 className="text-accent-contrast sm:text-xl text-[22px]">
                  {publication.name}
                </h2>
              </div>
              <p className="sm:text-lg text-tertiary">{record?.description} </p>
              {profile && (
                <p className="italic">
                  <strong className="text-secondary">
                    by {profile.displayName}
                  </strong>{" "}
                  <a
                    className="text-tertiary"
                    href={`https://bsky.app/profile/${profile.handle}`}
                  >
                    @{profile.handle}
                  </a>
                </p>
              )}
              <div className="sm:pt-4 pt-2">
                <SubscribeWithBluesky
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
                  let record = doc.documents.data as PubLeafletDocument.Record;
                  return (
                    <React.Fragment key={doc.documents?.uri}>
                      <div className="flex w-full ">
                        <Link
                          href={`${getPublicationURL(publication)}/${uri.rkey}`}
                          className="publishedPost grow flex flex-col hover:!no-underline"
                        >
                          <h3 className="text-primary">{record.title}</h3>
                          <p className="italic text-secondary">
                            {record.description}
                          </p>
                          <p className="text-sm text-tertiary pt-2">
                            {record.publishedAt &&
                              new Date(record.publishedAt).toLocaleDateString(
                                undefined,
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "2-digit",
                                },
                              )}{" "}
                          </p>
                        </Link>
                      </div>
                      <hr className="last:hidden border-border-light" />
                    </React.Fragment>
                  );
                })}
            </div>
          </div>
        </div>
      </PublicationThemeProvider>
    );
  } catch (e) {
    console.log(e);
    return <pre>{JSON.stringify(e, undefined, 2)}</pre>;
  }
}

const PubNotFound = () => {
  return (
    <div className="p-4 text-lg text-center flex flex-col gap-4">
      <p>Sorry, publication not found!</p>
      <p>
        This may be a glitch on our end. If the issue persists please{" "}
        <a href="mailto:contact@leaflet.pub">send us a note</a>.
      </p>
    </div>
  );
};
