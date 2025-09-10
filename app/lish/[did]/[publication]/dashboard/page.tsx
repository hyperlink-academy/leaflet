import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";

import { Sidebar } from "components/ActionBar/Sidebar";

import { Footer } from "components/ActionBar/Footer";
import { DraftList } from "./DraftList";
import { getIdentityData } from "actions/getIdentityData";
import { Actions } from "./Actions";
import React from "react";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { PublicationSWRDataProvider } from "./PublicationSWRProvider";
import { PublishedPostsList } from "./PublishedPostsLists";
import { PubLeafletPublication } from "lexicons/api";
import { PublicationSubscribers } from "./PublicationSubscribers";
import { PublicationThemeProviderDashboard } from "components/ThemeManager/PublicationThemeProvider";
import { AtUri } from "@atproto/syntax";
import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";

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

  if (!publication || identity.atp_did !== publication.identity_did)
    return <PubNotFound />;
  let record = publication?.record as PubLeafletPublication.Record | null;
  let uri = new AtUri(publication.uri);

  try {
    return (
      <PublicationSWRDataProvider
        publication_did={did}
        publication_rkey={uri.rkey}
        publication_data={publication}
      >
        <PublicationThemeProviderDashboard record={record}>
          <DashboardLayout
            hasBackgroundImage={!!record?.theme?.backgroundImage}
            defaultTab="Drafts"
            tabs={{
              Drafts: <DraftList />,
              Published: <PublishedPostsList />,
              Subscribers: <PublicationSubscribers />,
            }}
            actions={<Actions publication={publication.uri} />}
            currentPage="pub"
            publication={publication.uri}
          />
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
    <NotFoundLayout>
      <p className="font-bold">Sorry, we can't find this publication!</p>
      <p>
        This may be a glitch on our end. If the issue persists please{" "}
        <a href="mailto:contact@leaflet.pub">send us a note</a>.
      </p>
    </NotFoundLayout>
  );
};
