import { supabaseServerClient } from "supabase/serverClient";
import { getIdentityData } from "actions/getIdentityData";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { PublicationSWRDataProvider } from "../dashboard/PublicationSWRProvider";
import { PublicationThemeProviderDashboard } from "components/ThemeManager/PublicationThemeProvider";
import { AtUri } from "@atproto/syntax";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { ThemeSettingsContent } from "./ThemeSettingsContent";

export default async function ThemeSettingsPage(props: {
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
  if (!did) return <ThemeNotFound />;
  let { result: publication_data } = await get_publication_data.handler(
    {
      did,
      publication_name: decodeURIComponent(params.publication),
    },
    { supabase: supabaseServerClient },
  );
  let { publication } = publication_data;
  const record = normalizePublicationRecord(publication?.record);

  if (!publication || identity.atp_did !== publication.identity_did || !record)
    return <ThemeNotFound />;
  let uri = new AtUri(publication.uri);

  try {
    return (
      <PublicationSWRDataProvider
        publication_did={did}
        publication_rkey={uri.rkey}
        publication_data={publication_data}
      >
        <PublicationThemeProviderDashboard>
          <ThemeSettingsContent />
        </PublicationThemeProviderDashboard>
      </PublicationSWRDataProvider>
    );
  } catch (e) {
    return <pre>{JSON.stringify(e, undefined, 2)}</pre>;
  }
}

const ThemeNotFound = () => {
  return (
    <NotFoundLayout>
      <p className="font-bold">Sorry, we can&apos;t find this publication!</p>
      <p>
        This may be a glitch on our end. If the issue persists please{" "}
        <a href="mailto:contact@leaflet.pub">send us a note</a>.
      </p>
    </NotFoundLayout>
  );
};
