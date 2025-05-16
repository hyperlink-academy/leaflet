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
import React from "react";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { PublicationSWRDataProvider } from "./PublicationSWRProvider";
import { PublishedPostsList } from "./PublishedPostsLists";

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
      <PublicationSWRDataProvider
        publication_did={did}
        publication_name={publication.name}
        publication_data={publication}
      >
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
                    Drafts: <DraftList />,
                    Published: <PublishedPostsList />,
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
      </PublicationSWRDataProvider>
    );
  } catch (e) {
    console.log(e);
    return <pre>{JSON.stringify(e, undefined, 2)}</pre>;
  }
}

const PubNotFound = () => {
  return <div>ain't no pub here</div>;
};
