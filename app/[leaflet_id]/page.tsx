import { Metadata } from "next";
import * as Y from "yjs";
import * as base64 from "base64-js";

import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { YJSFragmentToString } from "components/Blocks/TextBlock/RenderYJSFragment";
import { Leaflet } from "./Leaflet";
import { scanIndexLocal } from "src/replicache/utils";
import { getRSVPData } from "actions/getRSVPData";
import { PageSWRDataProvider } from "components/PageSWRDataProvider";
import { getPollData } from "actions/pollActions";
import { supabaseServerClient } from "supabase/serverClient";
import { get_leaflet_data } from "app/api/rpc/[command]/get_leaflet_data";

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Props = {
  // this is now a token id not leaflet! Should probs rename
  params: Promise<{ leaflet_id: string }>;
};
export default async function LeafletPage(props: Props) {
  let { result: res } = await get_leaflet_data.handler(
    { token_id: (await props.params).leaflet_id },
    { supabase: supabaseServerClient },
  );
  let rootEntity = res.data?.root_entity;
  if (!rootEntity || !res.data || res.data.blocked_by_admin)
    return (
      <div className="w-screen h-full flex place-items-center bg-bg-leaflet">
        <div className="bg-bg-page mx-auto p-4 border border-border rounded-md flex flex-col text-center justify-center gap-1 w-fit">
          <div className="font-bold">
            Hmmm…we couldn&apos;t find that Leaflet.
          </div>
          <div>
            You can{" "}
            <a href="mailto:contact@leaflet.pub" target="blank">
              email us
            </a>{" "}
            for help!
          </div>
        </div>
      </div>
    );

  let [{ data }, rsvp_data, poll_data] = await Promise.all([
    supabaseServerClient.rpc("get_facts", {
      root: rootEntity,
    }),
    getRSVPData(res.data.permission_token_rights.map((ptr) => ptr.entity_set)),
    getPollData(res.data.permission_token_rights.map((ptr) => ptr.entity_set)),
  ]);
  let initialFacts = (data as unknown as Fact<Attribute>[]) || [];
  return (
    <PageSWRDataProvider
      rsvp_data={rsvp_data}
      poll_data={poll_data}
      leaflet_id={res.data.id}
      leaflet_data={res}
    >
      <Leaflet
        initialFacts={initialFacts}
        leaflet_id={rootEntity}
        token={res.data}
      />
    </PageSWRDataProvider>
  );
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  let { result: res } = await get_leaflet_data.handler(
    { token_id: (await props.params).leaflet_id },
    { supabase: supabaseServerClient },
  );
  let rootEntity = res.data?.root_entity;
  if (!rootEntity || !res.data) return { title: "Leaflet not found" };
  if (res.data.leaflets_in_publications[0]) {
    return {
      title: res.data.leaflets_in_publications[0].title || "Untitled",
      description: res.data.leaflets_in_publications[0].description,
    };
  }
  let { data } = await supabaseServerClient.rpc("get_facts", {
    root: rootEntity,
  });
  let initialFacts = (data as unknown as Fact<Attribute>[]) || [];
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
