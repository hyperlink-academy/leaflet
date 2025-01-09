import { Metadata } from "next";
import * as Y from "yjs";
import * as base64 from "base64-js";

import { Fact } from "src/replicache";
import { Database } from "../../supabase/database.types";
import { Attributes } from "src/replicache/attributes";
import { createServerClient } from "@supabase/ssr";
import { YJSFragmentToString } from "components/Blocks/TextBlock/RenderYJSFragment";
import { Leaflet } from "./Leaflet";
import { scanIndexLocal } from "src/replicache/utils";
import { getRSVPData } from "actions/getRSVPData";
import { RSVPDataProvider } from "components/RSVPDataProvider";

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);
type Props = {
  // this is now a token id not leaflet! Should probs rename
  params: { leaflet_id: string };
};
export default async function LeafletPage(props: Props) {
  let res = await supabase
    .from("permission_tokens")
    .select("*, permission_token_rights(*) ")
    .eq("id", props.params.leaflet_id)
    .single();
  let rootEntity = res.data?.root_entity;
  if (!rootEntity || !res.data)
    return (
      <div className="w-screen h-screen flex place-items-center bg-bg-leaflet">
        <div className="bg-bg-page mx-auto p-4 border border-border rounded-md flex flex-col text-center justify-centergap-1 w-fit">
          <div className="font-bold">
            Hmmm... Couldn&apos;t find that leaflet.
          </div>
          <div>
            You can{" "}
            <a href="mailto:contact@hyperlink.academy" target="blank">
              email us
            </a>{" "}
            for help!
          </div>
        </div>
      </div>
    );

  let [{ data }, identity_data] = await Promise.all([
    supabase.rpc("get_facts", {
      root: rootEntity,
    }),
    getRSVPData(res.data.permission_token_rights.map((ptr) => ptr.entity_set)),
  ]);
  let initialFacts = (data as unknown as Fact<keyof typeof Attributes>[]) || [];
  return (
    <RSVPDataProvider data={identity_data}>
      <Leaflet
        initialFacts={initialFacts}
        leaflet_id={rootEntity}
        token={res.data}
      />
    </RSVPDataProvider>
  );
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  let res = await supabase
    .from("permission_tokens")
    .select("*, permission_token_rights(*)")
    .eq("id", props.params.leaflet_id)
    .single();
  let rootEntity = res.data?.root_entity;
  if (!rootEntity || !res.data) return { title: "Leaflet not found" };
  let { data } = await supabase.rpc("get_facts", {
    root: rootEntity,
  });
  let initialFacts = (data as unknown as Fact<keyof typeof Attributes>[]) || [];
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
          type: type[0].data.value,
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
