import { supabaseServerClient } from "supabase/serverClient";
import { Metadata } from "next";
import { getIdentityData } from "actions/getIdentityData";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { PublicationSWRDataProvider } from "./PublicationSWRProvider";
import { PubLeafletPublication } from "lexicons/api";
import { PublicationThemeProviderDashboard } from "components/ThemeManager/PublicationThemeProvider";
import { AtUri } from "@atproto/syntax";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import PublicationDashboard from "./PublicationDashboard";
import Link from "next/link";

export async function generateMetadata(props: {
  params: Promise<{ publication: string; did: string }>;
}): Promise<Metadata> {
  let did = decodeURIComponent((await props.params).did);
  if (!did) return { title: "Publication 404" };

  let { result: publication_data } = await get_publication_data.handler(
    {
      did,
      publication_name: decodeURIComponent((await props.params).publication),
    },
    { supabase: supabaseServerClient },
  );
  let { publication } = publication_data;
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
      <NotFoundLayout>
        <p>Looks like you&apos;re not logged in.</p>
        <p>
          If the issue persists please{" "}
          <a href="mailto:contact@leaflet.pub">send us a note</a>.
        </p>
      </NotFoundLayout>
    );
  let did = decodeURIComponent(params.did);
  if (!did) return <PubNotFound />;
  let { result: publication_data } = await get_publication_data.handler(
    {
      did,
      publication_name: decodeURIComponent((await props.params).publication),
    },
    { supabase: supabaseServerClient },
  );
  let { publication, leaflet_data } = publication_data;
  let record = publication?.record as PubLeafletPublication.Record | null;

  if (!publication || identity.atp_did !== publication.identity_did || !record)
    return <PubNotFound />;
  let uri = new AtUri(publication.uri);

  try {
    return (
      <PublicationSWRDataProvider
        publication_did={did}
        publication_rkey={uri.rkey}
        publication_data={publication_data}
      >
        <PublicationThemeProviderDashboard>
          <PublicationDashboard publication={publication} record={record} />
        </PublicationThemeProviderDashboard>
      </PublicationSWRDataProvider>
    );
  } catch (e) {
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
