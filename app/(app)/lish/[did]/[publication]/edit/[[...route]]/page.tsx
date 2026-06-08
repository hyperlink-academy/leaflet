import React from "react";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { PublicationPageEditLeaflet } from "./PublicationPageEditLeaflet";
import { PageSWRDataProvider } from "components/PageSWRDataProvider";
import { getPollData } from "actions/pollActions";
import { supabaseServerClient } from "supabase/serverClient";
import { get_leaflet_data } from "app/api/rpc/[command]/get_leaflet_data";
import { get_publication_data } from "app/api/rpc/[command]/get_publication_data";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { FontLoader, extractFontsFromFacts } from "components/FontLoader";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Props = {
  params: Promise<{ did: string; publication: string; route?: string[] }>;
};

export default async function PublicationEditPage(props: Props) {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  let publicationName = decodeURIComponent(params.publication);
  let path = "/" + (params.route?.map(decodeURIComponent).join("/") ?? "");

  let { result: publication_data } = await get_publication_data.handler(
    { did, publication_name: publicationName },
    { supabase: supabaseServerClient },
  );
  let publication = publication_data.publication;
  if (!publication) return <PageNotFound path={path} />;

  let page = publication.publication_pages?.find((p) => p.path === path);
  if (!page) return <PageNotFound path={path} />;

  let { result: res } = await get_leaflet_data.handler(
    { token_id: page.leaflet_src },
    { supabase: supabaseServerClient },
  );
  let rootEntity = res.data?.root_entity;
  if (!rootEntity || !res.data || res.data.blocked_by_admin)
    return <PageNotFound path={path} />;

  let [{ data }, poll_data] = await Promise.all([
    supabaseServerClient.rpc("get_facts", { root: rootEntity }),
    getPollData(res.data.permission_token_rights.map((ptr) => ptr.entity_set)),
  ]);
  let initialFacts = (data as unknown as Fact<Attribute>[]) || [];

  let pubRecord = normalizePublicationRecord(publication.record);
  const headingFontId = pubRecord?.theme?.headingFont;
  const bodyFontId = pubRecord?.theme?.bodyFont;
  const fallbackFonts = extractFontsFromFacts(initialFacts as any, rootEntity);

  return (
    <React.Fragment key={page.leaflet_src}>
      <FontLoader
        headingFontId={headingFontId ?? fallbackFonts.headingFontId}
        bodyFontId={bodyFontId ?? fallbackFonts.bodyFontId}
      />
      <PageSWRDataProvider
        poll_data={poll_data}
        leaflet_id={res.data.id}
        leaflet_data={res}
      >
        <PublicationPageEditLeaflet
          initialFacts={initialFacts}
          leaflet_id={rootEntity}
          token={res.data}
          publicationRecord={publication.record}
          publicationCreator={publication.identity_did}
          publicationUri={publication.uri}
          pagePath={path}
          pageTitle={page.title ?? ""}
        />
      </PageSWRDataProvider>
    </React.Fragment>
  );
}

const PageNotFound = (props: { path: string }) => (
  <NotFoundLayout>
    <p className="font-bold">No publication page at {props.path}</p>
    <p>Use the Editing Pages button to create one.</p>
  </NotFoundLayout>
);
