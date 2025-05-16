import { IdResolver } from "@atproto/identity";
import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";

import { Sidebar } from "components/ActionBar/Sidebar";

import { Media } from "components/Media";
import { Footer } from "components/ActionBar/Footer";
import { PublicationDashboard } from "./PublicationDashboard";
import { DraftList } from "./DraftList";
import { getIdentityData } from "actions/getIdentityData";
import { ThemeProvider } from "components/ThemeManager/ThemeProvider";
import { Actions } from "./Actions";
import Link from "next/link";
import { AtUri } from "@atproto/syntax";
import { PubLeafletDocument } from "lexicons/api";
import React from "react";
import { EditTiny } from "components/Icons/EditTiny";
import { MoreOptionsVerticalTiny } from "components/Icons/MoreOptionsVerticalTiny";
import { Menu, MenuItem } from "components/Layout";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";

const idResolver = new IdResolver();

export async function generateMetadata(props: {
  params: Promise<{ publication: string; handle: string }>;
}): Promise<Metadata> {
  let did = await idResolver.handle.resolve((await props.params).handle);
  if (!did) return { title: "Publication 404" };

  let { result: publication } = await get_publication_data.handler(
    {
      did,
      publication_name: decodeURIComponent((await props.params).publication),
    },
    { supabase: supabaseServerClient },
  );
  if (!publication) return { title: "404 Publication" };
  return { title: decodeURIComponent((await props.params).publication) };
}

//This is the admin dashboard of the publication
export default async function Publication(props: {
  params: Promise<{ publication: string; handle: string }>;
}) {
  let params = await props.params;
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return <PubNotFound />;
  let did = await idResolver.handle.resolve((await props.params).handle);
  if (!did) return <PubNotFound />;
  let { result: publication } = await get_publication_data.handler(
    {
      did,
      publication_name: decodeURIComponent((await props.params).publication),
    },
    { supabase: supabaseServerClient },
  );
  if (!publication || identity.atp_did !== publication.identity_did)
    return <PubNotFound />;

  try {
    return (
      <ThemeProvider entityID={null}>
        <div className="w-screen h-screen flex place-items-center bg-[#FDFCFA]">
          <div className="relative max-w-prose w-full h-full mx-auto flex sm:flex-row flex-col sm:items-stretch sm:px-6">
            <div className="w-12 relative">
              <Sidebar className="mt-6 p-2">
                <Actions publication={publication.uri} />
              </Sidebar>
            </div>
            <div
              className={`h-full overflow-y-scroll pt-4 sm:pl-5 sm:pt-9 w-full`}
            >
              <PublicationDashboard
                name={publication.name}
                tabs={{
                  Drafts: (
                    <DraftList
                      publication={publication.uri}
                      drafts={publication.leaflets_in_publications.filter(
                        (p) => !p.doc,
                      )}
                    />
                  ),
                  Published:
                    publication.documents_in_publications.length === 0 ? (
                      <div className="italic text-tertiary w-full container text-center place-items-center flex flex-col gap-3 p-3">
                        Nothing's been published yet...
                      </div>
                    ) : (
                      <div className="publishedList w-full flex flex-col gap-4 pb-6">
                        {publication.documents_in_publications.map((doc) => {
                          if (!doc.documents) return null;
                          let leaflet =
                            publication.leaflets_in_publications.find(
                              (l) =>
                                doc.documents && l.doc === doc.documents.uri,
                            );
                          let uri = new AtUri(doc.documents.uri);
                          let record = doc.documents
                            .data as PubLeafletDocument.Record;

                          return (
                            <React.Fragment key={doc.documents?.uri}>
                              <div className="flex  w-full ">
                                <Link
                                  href={`/lish/${params.handle}/${params.publication}/${uri.rkey}`}
                                  className="publishedPost grow flex flex-col hover:!no-underline"
                                >
                                  <h3 className="text-primary">
                                    {record.title}
                                  </h3>
                                  <p className="italic text-secondary">
                                    This is a placeholder for description
                                  </p>
                                  <p className="text-sm text-tertiary pt-2">
                                    {record.publishedAt} PlaceholderDate
                                  </p>
                                </Link>
                                {leaflet && (
                                  <Link
                                    className="pt-[6px]"
                                    href={`/${leaflet.leaflet}`}
                                  >
                                    <EditTiny />
                                  </Link>
                                )}
                              </div>
                              <hr className="last:hidden border-border-light" />
                            </React.Fragment>
                          );
                        })}
                      </div>
                    ),
                }}
                defaultTab={"Drafts"}
              />
            </div>
            <Media mobile>
              <Footer>
                <Actions publication={publication.uri} />
              </Footer>
            </Media>
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
