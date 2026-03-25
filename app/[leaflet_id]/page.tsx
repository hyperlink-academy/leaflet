import { cache } from "react";
import { unstable_cache } from "next/cache";
import { Metadata } from "next";
import * as Y from "yjs";
import * as base64 from "base64-js";

import type { Fact, PermissionToken } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { YJSFragmentToString } from "src/utils/yjsFragmentToString";
import { Leaflet } from "./Leaflet";
import { scanIndexLocal } from "src/replicache/utils";
import { PageSWRDataProvider } from "components/PageSWRDataProvider";
import { supabaseServerClient } from "supabase/serverClient";
import type { GetLeafletDataReturnType } from "app/api/rpc/[command]/get_leaflet_data";
import { NotFoundLayout } from "components/PageLayouts/NotFoundLayout";
import { getPublicationMetadataFromLeafletData } from "src/utils/getPublicationMetadataFromLeafletData";
import { FontLoader, extractFontsFromFacts } from "components/FontLoader";

type LeafletData = NonNullable<GetLeafletDataReturnType["result"]["data"]>;

const getCachedLeafletPageData = cache((token_id: string) =>
  unstable_cache(
    async () => {
      let { data, error } = await supabaseServerClient.rpc(
        "get_leaflet_page_data",
        { p_token_id: token_id },
      );
      if (!data || error) return { data: null, error };

      let row = Array.isArray(data) ? data[0] : data;
      if (!row) return { data: null, error: null };

      let leafletData = {
        ...(row.permission_token as Record<string, unknown>),
        permission_token_rights: row.permission_token_rights || [],
        leaflets_in_publications: row.leaflets_in_publications || [],
        leaflets_to_documents: row.leaflets_to_documents || [],
        custom_domain_routes: row.custom_domain_routes || [],
      } as LeafletData;

      let facts = (row.facts || []) as unknown as Fact<Attribute>[];

      return { data: leafletData, facts, error: null };
    },
    [`leaflet-page-data-${token_id}`],
    { revalidate: 30 },
  )(),
);

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Props = {
  // this is now a token id not leaflet! Should probs rename
  params: Promise<{ leaflet_id: string }>;
};
export default async function LeafletPage(props: Props) {
  let { data, facts } = await getCachedLeafletPageData(
    (await props.params).leaflet_id,
  );

  if (!data || data.blocked_by_admin)
    return (
      <NotFoundLayout>
        <p className="font-bold">Sorry, we can&apos;t find this leaflet!</p>
        <p>
          This may be a glitch on our end. If the issue persists please{" "}
          <a href="mailto:contact@leaflet.pub">send us a note</a>.
        </p>
      </NotFoundLayout>
    );

  let rootEntity = data.root_entity;
  let initialFacts = facts || [];

  const { headingFontId, bodyFontId } = extractFontsFromFacts(
    initialFacts,
    rootEntity,
  );

  let token: PermissionToken = {
    id: data.id,
    root_entity: data.root_entity,
    permission_token_rights: data.permission_token_rights,
  };

  return (
    <>
      <FontLoader headingFontId={headingFontId} bodyFontId={bodyFontId} />
      <PageSWRDataProvider leaflet_id={data.id} leaflet_data={data}>
        <Leaflet
          initialFacts={initialFacts}
          leaflet_id={rootEntity}
          token={token}
          initialHeadingFontId={headingFontId}
          initialBodyFontId={bodyFontId}
        />
      </PageSWRDataProvider>
    </>
  );
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  let { data, facts } = await getCachedLeafletPageData(
    (await props.params).leaflet_id,
  );

  if (!data) return { title: "Leaflet not found" };

  let rootEntity = data.root_entity;
  if (!rootEntity) return { title: "Leaflet not found" };

  let publication_data = getPublicationMetadataFromLeafletData(data);
  if (publication_data) {
    return {
      title: publication_data.title || "Untitled",
      description: publication_data.description,
    };
  }

  let initialFacts = facts || [];
  let scan = scanIndexLocal(initialFacts);
  let firstPage =
    scan.eav(rootEntity, "root/page")[0]?.data.value || rootEntity;
  let pageType = scan.eav(firstPage, "page/type")[0]?.data.value || "doc";
  let firstBlock, secondBlock;
  if (pageType === "canvas") {
    [firstBlock, secondBlock] = scan
      .eav(firstPage, "canvas/block")
      .map((b) => {
        let type = scan.eav(b.data.value, "block/type");
        if (!type[0]) return null;
        return {
          ...b.data,
          type: type[0].data.value,
        };
      })
      .filter((b) => b !== null)
      .filter((b) => b.type === "text" || b.type === "heading")
      .sort((a, b) => {
        if (a.position.y === b.position.y) {
          return a.position.x - b.position.x;
        }
        return a.position.y - b.position.y;
      });
  } else {
    [firstBlock, secondBlock] = scan
      .eav(firstPage, "card/block")
      .map((b) => {
        let type = scan.eav(b.data.value, "block/type");
        return {
          ...b.data,
          type: type[0]?.data.value,
        };
      })

      .filter((b) => b.type === "text" || b.type === "heading")
      .sort((a, b) => (a.position > b.position ? 1 : -1));
  }
  let metadata: Metadata = { title: "Untitled Leaflet", description: " " };

  let titleFact = initialFacts.find(
    (f) => f.entity === firstBlock?.value && f.attribute === "block/text",
  ) as Fact<"block/text"> | undefined;
  if (titleFact) {
    let doc = new Y.Doc();
    const update = base64.toByteArray(titleFact.data.value);
    Y.applyUpdate(doc, update);
    let nodes = doc.getXmlElement("prosemirror").toArray();
    metadata.title = YJSFragmentToString(nodes[0]);
  }

  let descriptionFact = initialFacts.find(
    (f) => f.entity === secondBlock?.value && f.attribute === "block/text",
  ) as Fact<"block/text"> | undefined;
  if (descriptionFact) {
    let doc = new Y.Doc();
    const update = base64.toByteArray(descriptionFact.data.value);
    Y.applyUpdate(doc, update);
    let nodes = doc.getXmlElement("prosemirror").toArray();
    metadata.description = YJSFragmentToString(nodes[0]);
  }

  return metadata;
}
