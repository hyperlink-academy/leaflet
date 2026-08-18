import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import type { Fact, PermissionToken } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { isUuid } from "src/utils/isUuid";
import { supabaseServerClient } from "supabase/serverClient";
import { FontLoader, extractFontsFromFacts } from "components/FontLoader";
import type { GetLeafletDataReturnType } from "app/api/rpc/[command]/get_leaflet_data";
import { VersionViewer } from "./VersionViewer";

type Props = {
  params: Promise<{ leaflet_id: string; version_id: string }>;
};

const getVersionData = cache(async (token_id: string, version_id: string) => {
  if (!isUuid(token_id) || !isUuid(version_id)) return null;
  let { data } = await supabaseServerClient
    .from("document_versions")
    .select(
      "id, name, created_at, snapshot, permission_tokens!inner(*, permission_token_rights(*))",
    )
    .eq("id", version_id)
    .eq("token", token_id)
    .single();
  if (
    !data?.snapshot ||
    data.permission_tokens.blocked_by_admin ||
    !data.permission_tokens.permission_token_rights.some((r) => r.write)
  )
    return null;
  return data;
});

export default async function VersionPage(props: Props) {
  let { leaflet_id, version_id } = await props.params;
  let version = await getVersionData(leaflet_id, version_id);
  if (!version) notFound();

  let facts = version.snapshot as unknown as Fact<Attribute>[];
  let rootEntity = version.permission_tokens.root_entity;
  let writeRight = version.permission_tokens.permission_token_rights.find(
    (right) => right.write,
  )!;

  let token: PermissionToken = {
    id: version.permission_tokens.id,
    root_entity: rootEntity,
    permission_token_rights: [
      {
        ...writeRight,
        write: false,
        create_token: false,
        change_entity_set: false,
      },
    ],
  };

  let staticLeafletData = {
    ...version.permission_tokens,
    permission_token_rights: token.permission_token_rights,
    leaflets_in_publications: [],
    leaflets_to_documents: [],
    publications: [],
    custom_domain_routes: [],
  } as unknown as Exclude<GetLeafletDataReturnType["result"]["data"], null>;

  const { headingFontId, bodyFontId } = extractFontsFromFacts(
    facts as any,
    rootEntity,
  );

  return (
    <>
      <FontLoader headingFontId={headingFontId} bodyFontId={bodyFontId} />
      <VersionViewer
        token={token}
        facts={facts}
        version={version}
        staticLeafletData={staticLeafletData}
        initialHeadingFontId={headingFontId}
        initialBodyFontId={bodyFontId}
      />
    </>
  );
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  let { leaflet_id, version_id } = await props.params;
  let version = await getVersionData(leaflet_id, version_id);
  if (!version) return { title: "Version not found" };
  return {
    title: version.name ? `Version: ${version.name}` : "Saved version",
  };
}
