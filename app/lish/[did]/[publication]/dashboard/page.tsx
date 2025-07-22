import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";

import { Sidebar } from "components/ActionBar/Sidebar";

import { Media } from "components/Media";
import { Footer } from "components/ActionBar/Footer";
import { PublicationDashboard } from "./PublicationDashboard";
import { DraftList } from "./DraftList";
import { getIdentityData } from "actions/getIdentityData";
import { Actions } from "./Actions";
import React from "react";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { PublicationSWRDataProvider } from "./PublicationSWRProvider";
import { PublishedPostsList } from "./PublishedPostsLists";
import { PubLeafletPublication, PubLeafletThemeColor } from "lexicons/api";
import { PublicationSubscribers } from "./PublicationSubscribers";
import {
  PublicationThemeProvider,
  PublicationThemeProviderDashboard,
} from "components/ThemeManager/PublicationThemeProvider";
import { blobRefToSrc } from "src/utils/blobRefToSrc";

export async function generateMetadata(props: {
  params: Promise<{ publication: string; did: string }>;
}): Promise<Metadata> {
  let did = decodeURIComponent((await props.params).did);
  if (!did) return { title: "Publication 404" };

  let { result: publication } = await get_publication_data.handler(
    {
      did,
      publication_name: decodeURIComponent((await props.params).publication),
    },
    { supabase: supabaseServerClient },
  );
  let record =
    (publication?.record as PubLeafletPublication.Record) || undefined;
  if (!publication) return { title: "404 Publication" };
  return { title: record?.name || "Untitled Publication" };
}

//This is the admin dashboard of the publication
export default async function Publication(props: {
  params: Promise<{ publication: string; did: string }>;
}) {
  let params = await props.params;
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did)
    return (
      <div className="p-4 text-lg text-center flex flex-col gap-4">
        <p>Sorry, looks like you&apos;re not logged in.</p>
        <p>
          This may be a glitch on our end. If the issue persists please{" "}
          <a href="mailto:contact@leaflet.pub">send us a note</a>.
        </p>
      </div>
    );
  let did = decodeURIComponent(params.did);
  if (!did) return <PubNotFound />;
  let { result: publication } = await get_publication_data.handler(
    {
      did,
      publication_name: decodeURIComponent((await props.params).publication),
    },
    { supabase: supabaseServerClient },
  );

  let record = publication?.record as PubLeafletPublication.Record | null;

  let showPageBackground = !!record?.theme?.showPageBackground;

  if (!publication || identity.atp_did !== publication.identity_did)
    return <PubNotFound />;

  try {
    return (
      <PublicationSWRDataProvider
        publication_did={did}
        publication_name={publication.name}
        publication_data={publication}
      >
        <PublicationThemeProviderDashboard record={record}>
          <div className="pubDashWrapper relative w-max h-full flex  items-stretch">
            <div className="flex sm:flex-row flex-col max-h-full h-full">
              <div
                className="pubDashSidebarWrapper flex justify-end items-start "
                style={{ width: `calc(50vw - ((var(--page-width-units)/2))` }}
              >
                <div className="pubDashSidebar relative w-16 justify-items-end">
                  <Sidebar className="mt-6 p-2 ">
                    <Actions publication={publication.uri} />
                  </Sidebar>
                </div>
              </div>
              <div
                className={`pubDash grow sm:h-full h-32 w-full flex flex-col items-stretch pt-2 sm:pt-6   ml-[6px] sm:ml-0 max-w-[var(--page-width-units)] ${showPageBackground ? "sm:pb-8 pb-1" : "pb-0"}`}
              >
                <PublicationDashboard
                  did={did}
                  icon={record?.icon ? record.icon : null}
                  name={publication.name}
                  tabs={{
                    Drafts: <DraftList />,
                    Published: <PublishedPostsList />,
                    Subscribers: <PublicationSubscribers />,
                  }}
                  defaultTab={"Drafts"}
                />
              </div>
              <Footer>
                <Actions publication={publication.uri} />
              </Footer>
            </div>
          </div>
        </PublicationThemeProviderDashboard>
      </PublicationSWRDataProvider>
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
