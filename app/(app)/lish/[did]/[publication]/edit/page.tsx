import React from "react";
import type { Metadata } from "next";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { AtUri } from "@atproto/syntax";
import { PageSWRDataProvider } from "components/PageSWRDataProvider";
import { getPollData } from "actions/pollActions";
import { getIdentityData } from "actions/getIdentityData";
import { createPublicationDraftLeaflet } from "actions/createPublicationDraftLeaflet";
import { supabaseServerClient } from "supabase/serverClient";
import { get_leaflet_data } from "app/api/rpc/[command]/get_leaflet_data";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { LoginModal } from "components/LoginButton";
import { FontLoader, extractFontsFromFacts } from "components/FontLoader";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { resolvePublicationTheme } from "lexicons/src/normalize";
import { PublicationSWRDataProvider } from "../dashboard/PublicationSWRProvider";
import { PublicationDraftEditor } from "./PublicationDraftEditor";

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function generateMetadata(props: {
  params: Promise<{ publication: string; did: string }>;
}): Promise<Metadata> {
  let robots = { index: false };
  let did = decodeURIComponent((await props.params).did);
  if (!did) return { title: "Publication 404", robots };

  let { result: publication_data } = await get_publication_data.handler(
    {
      did,
      publication_name: decodeURIComponent((await props.params).publication),
    },
    { supabase: supabaseServerClient },
  );
  let { publication } = publication_data;
  const record = normalizePublicationRecord(publication?.record);
  if (!publication) return { title: "404 Publication", robots };
  return {
    title: `Edit Pages — ${record?.name || "Untitled Publication"}`,
    robots,
  };
}

type Props = {
  params: Promise<{ did: string; publication: string }>;
};

export default async function PublicationEditPage(props: Props) {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  let publicationName = decodeURIComponent(params.publication);

  let [identity, { result: publication_data }] = await Promise.all([
    getIdentityData(),
    get_publication_data.handler(
      { did, publication_name: publicationName },
      { supabase: supabaseServerClient },
    ),
  ]);

  if (!identity || !identity.atp_did) {
    return (
      <NotFoundLayout>
        <p>
          Looks like you&apos;re not logged in.{" "}
          <LoginModal
            redirectRoute={`/lish/${params.did}/${params.publication}/dashboard`}
            trigger={
              <div className="text-accent-contrast font-bold">Log in here</div>
            }
          />
          !
        </p>
      </NotFoundLayout>
    );
  }

  let publication = publication_data.publication;
  let pubRecord = normalizePublicationRecord(publication?.record);
  if (
    !publication ||
    !pubRecord ||
    identity.atp_did !== publication.identity_did
  ) {
    return <PageNotFound />;
  }

  // Publications created before draft leaflets existed get one on their first
  // visit to the editor.
  let draftLeaflet = publication.draft_leaflet;
  if (!draftLeaflet) {
    draftLeaflet = await createPublicationDraftLeaflet({
      publication_uri: publication.uri,
      did,
      description: pubRecord?.description,
      theme: resolvePublicationTheme(pubRecord),
    });
  }

  let { result: res } = await get_leaflet_data.handler(
    { token_id: draftLeaflet },
    { supabase: supabaseServerClient },
  );
  let rootEntity = res.data?.root_entity;
  if (!rootEntity || !res.data || res.data.blocked_by_admin)
    return <PageNotFound />;

  let [{ data }, poll_data] = await Promise.all([
    supabaseServerClient.rpc("get_facts", { root: rootEntity }),
    getPollData(res.data.permission_token_rights.map((ptr) => ptr.entity_set)),
  ]);
  let initialFacts = (data as unknown as Fact<Attribute>[]) || [];

  // Draft theme (including fonts) lives as facts on the draft leaflet.
  const fonts = extractFontsFromFacts(initialFacts as any, rootEntity);

  let uri = new AtUri(publication.uri);

  return (
    <PublicationSWRDataProvider
      publication_did={uri.host}
      publication_rkey={uri.rkey}
      publication_data={publication_data}
    >
      <React.Fragment key={draftLeaflet}>
        <FontLoader
          headingFontId={fonts.headingFontId}
          bodyFontId={fonts.bodyFontId}
        />
        <PageSWRDataProvider
          poll_data={poll_data}
          leaflet_id={res.data.id}
          leaflet_data={res}
        >
          <PublicationDraftEditor
            initialFacts={initialFacts}
            leaflet_id={rootEntity}
            token={res.data}
            did={did}
            publicationName={params.publication}
            publicationRecord={pubRecord}
            publicationUri={publication.uri}
            newsletterMode={
              !!publication.publication_newsletter_settings?.enabled
            }
          />
        </PageSWRDataProvider>
      </React.Fragment>
    </PublicationSWRDataProvider>
  );
}

const PageNotFound = () => (
  <NotFoundLayout>
    <p className="font-bold">Sorry, we can&apos;t find this publication!</p>
  </NotFoundLayout>
);
