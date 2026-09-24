import { AtUri } from "@atproto/syntax";
import { getIdentityData } from "actions/getIdentityData";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { ThemeProvider } from "components/ThemeManager/ThemeProvider";
import { supabaseServerClient } from "supabase/serverClient";
import { PublicationSWRDataProvider } from "../dashboard/PublicationSWRProvider";
import { PublicationCreatedContent } from "./PublicationCreatedContent";

export const dynamic = "force-dynamic";

export default async function PublicationCreatedPage(props: {
  params: Promise<{ did: string; publication: string }>;
}) {
  let params = await props.params;
  let did = decodeURIComponent(params.did);

  let [identity, { result: publication_data }] = await Promise.all([
    getIdentityData(),
    get_publication_data.handler(
      { did, publication_name: decodeURIComponent(params.publication) },
      { supabase: supabaseServerClient },
    ),
  ]);

  let publication = publication_data.publication;
  if (!identity?.atp_did || publication?.identity_did !== identity.atp_did)
    return (
      <NotFoundLayout>
        <p className="font-bold">
          Sorry, we can&apos;t find this publication!
        </p>
      </NotFoundLayout>
    );

  let uri = new AtUri(publication.uri);
  return (
    <PublicationSWRDataProvider
      publication_did={uri.host}
      publication_rkey={uri.rkey}
      publication_data={publication_data}
    >
      <ThemeProvider entityID={null}>
        <PublicationCreatedContent
          dashboardHref={`/lish/${params.did}/${params.publication}/dashboard`}
        />
      </ThemeProvider>
    </PublicationSWRDataProvider>
  );
}
