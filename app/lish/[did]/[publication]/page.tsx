import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";

import { ThemeProvider } from "components/ThemeManager/ThemeProvider";
import React from "react";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { AtUri } from "@atproto/syntax";
import { PubLeafletDocument, PubLeafletPublication } from "lexicons/api";
import Link from "next/link";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";

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
  return { title: decodeURIComponent(params.publication) };
}

export default async function Publication(props: {
  params: Promise<{ publication: string; did: string }>;
}) {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  if (!did) return <PubNotFound />;
  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select(
      `*,
      documents_in_publications(documents(*))
      `,
    )
    .eq("identity_did", did)
    .eq("name", decodeURIComponent(params.publication))
    .single();

  let record = publication?.record as PubLeafletPublication.Record;

  if (!publication) return <PubNotFound />;
  try {
    return (
      <ThemeProvider entityID={null}>
        <div className="publicationWrapper w-screen h-screen flex place-items-center bg-[#FDFCFA]">
          <div className="publication max-w-prose w-full mx-auto h-full pt-8 px-2 pb-12 sm:pb-8">
            <div className="flex flex-col pb-6 w-full text-center justify-center ">
              <div className="flex flex-row gap-3 justify-center">
                {record.icon && (
                  <div
                    className="shrink-0 w-8 h-8 rounded-full mt-1"
                    style={{
                      backgroundImage: `url(https://bsky.social/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${(record.icon.ref as unknown as { $link: string })["$link"]})`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                      backgroundSize: "cover",
                    }}
                  />
                )}
                <h2 className="text-accent-contrast">{publication.name}</h2>
              </div>
              <p className="text-lg text-tertiary">{record.description} </p>
            </div>
            <div className="publicationPostList w-full flex flex-col gap-4 pb-6">
              {publication.documents_in_publications
                .filter((d) => !!d?.documents)
                .sort((a, b) => {
                  let aRecord = a.documents?.data! as PubLeafletDocument.Record;
                  let bRecord = a.documents?.data! as PubLeafletDocument.Record;
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
      </ThemeProvider>
    );
  } catch (e) {
    console.log(e);
    return <pre>{JSON.stringify(e, undefined, 2)}</pre>;
  }
}

const PubNotFound = () => {
  return <div>ain't no pub here</div>;
};
