import { Metadata, ResolvingMetadata } from "next";
import * as Y from "yjs";
import * as base64 from "base64-js";

import { Fact, ReplicacheProvider } from "src/replicache";
import { Database } from "../../supabase/database.types";
import { Attributes } from "src/replicache/attributes";
import { createServerClient } from "@supabase/ssr";
import { SelectionManager } from "components/SelectionManager";
import { Cards } from "components/Cards";
import { ThemeProvider } from "components/ThemeManager/ThemeProvider";
import { MobileFooter } from "components/MobileFooter";
import { PopUpProvider } from "components/Toast";
import { YJSFragmentToString } from "components/TextBlock/RenderYJSFragment";
import { Doc } from "./Doc";

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);
type Props = {
  params: { doc_id: string };
};
export default async function DocumentPage(props: Props) {
  let { data } = await supabase.rpc("get_facts", { root: props.params.doc_id });
  let initialFacts = (data as unknown as Fact<keyof typeof Attributes>[]) || [];
  return <Doc initialFacts={initialFacts} doc_id={props.params.doc_id} />;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  let { data } = await supabase.rpc("get_facts", { root: props.params.doc_id });
  let initialFacts = (data as unknown as Fact<keyof typeof Attributes>[]) || [];
  let blocks = initialFacts
    .filter(
      (f) => f.attribute === "card/block" && f.entity === props.params.doc_id,
    )
    .map((_f) => {
      let block = _f as Fact<"card/block">;
      let type = initialFacts.find(
        (f) => f.entity === block.data.value && f.attribute === "block/type",
      ) as Fact<"block/type"> | undefined;
      if (!type) return null;
      return { ...block.data, type: type.data.value, parent: block.entity };
    })
    .flatMap((f) => (f ? [f] : []))
    .sort((a, b) => (a.position > b.position ? 1 : -1))
    .filter((b) => b.type === "text" || b.type === "heading");

  let metadata: Metadata = { title: "Untitled Leaflet" };
  let firstBlock = blocks[0];
  if (firstBlock?.type === "heading") {
    let content = initialFacts.find(
      (f) => f.entity === firstBlock.value && f.attribute === "block/text",
    ) as Fact<"block/text"> | undefined;
    if (content) {
      let doc = new Y.Doc();
      const update = base64.toByteArray(content.data.value);
      Y.applyUpdate(doc, update);
      let nodes = doc.getXmlElement("prosemirror").toArray();
      metadata.title = YJSFragmentToString(nodes[0]);
    }
  }
  return metadata;
}
