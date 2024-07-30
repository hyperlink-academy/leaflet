import { Metadata } from "next";
import * as Y from "yjs";
import * as base64 from "base64-js";

import { Fact } from "src/replicache";
import { Database } from "../../supabase/database.types";
import { Attributes } from "src/replicache/attributes";
import { createServerClient } from "@supabase/ssr";
import { YJSFragmentToString } from "components/Blocks/TextBlock/RenderYJSFragment";
import { Doc } from "./Doc";
import { cookies } from "next/headers";

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);
type Props = {
  // this is now a token id not doc! Should probs rename
  params: { doc_id: string };
};
export default async function DocumentPage(props: Props) {
  let res = await supabase
    .from("permission_tokens")
    .select("*, permission_token_rights(*), permission_token_on_homepage(*)")
    .eq("id", props.params.doc_id)
    .single();
  let rootEntity = res.data?.root_entity;
  if (!rootEntity || !res.data)
    return (
      <div className="w-screen h-screen flex place-items-center bg-bg-page">
        <div className="bg-bg-card mx-auto p-4 border border-border rounded-md flex flex-col text-center justify-centergap-1 w-fit">
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
  let identity = cookies().get("identity");
  if (
    identity?.value &&
    res.data.permission_token_rights.find((f) => f.write) &&
    !res.data.permission_token_on_homepage.find(
      (f) => f.identity === identity.value,
    )
  ) {
    await supabase.from("permission_token_on_homepage").insert({
      identity: identity.value,
      token: res.data.id,
    });
  }
  let { data } = await supabase.rpc("get_facts", {
    root: rootEntity,
  });
  let initialFacts = (data as unknown as Fact<keyof typeof Attributes>[]) || [];
  return (
    <Doc initialFacts={initialFacts} doc_id={rootEntity} token={res.data} />
  );
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  let res = await supabase
    .from("permission_tokens")
    .select("*, permission_token_rights(*)")
    .eq("id", props.params.doc_id)
    .single();
  let rootEntity = res.data?.root_entity;
  if (!rootEntity || !res.data) return { title: "Doc not found" };
  let { data } = await supabase.rpc("get_facts", {
    root: rootEntity,
  });
  let initialFacts = (data as unknown as Fact<keyof typeof Attributes>[]) || [];
  let blocks = initialFacts
    .filter((f) => f.attribute === "card/block" && f.entity === rootEntity)
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

  let metadata: Metadata = { title: "Untitled Leaflet", description: " " };
  let block: undefined | (typeof blocks)[0] = blocks[0];
  if (block?.type === "heading") {
    let content = initialFacts.find(
      (f) => f.entity === block?.value && f.attribute === "block/text",
    ) as Fact<"block/text"> | undefined;
    if (content) {
      let doc = new Y.Doc();
      const update = base64.toByteArray(content.data.value);
      Y.applyUpdate(doc, update);
      let nodes = doc.getXmlElement("prosemirror").toArray();
      metadata.title = YJSFragmentToString(nodes[0]);
    }
    block = blocks[1];
  }
  if (!block) return metadata;
  let content = initialFacts.find(
    (f) => f.entity === block.value && f.attribute === "block/text",
  ) as Fact<"block/text"> | undefined;
  if (content) {
    let doc = new Y.Doc();
    const update = base64.toByteArray(content.data.value);
    Y.applyUpdate(doc, update);
    let nodes = doc.getXmlElement("prosemirror").toArray();
    metadata.description = YJSFragmentToString(nodes[0]);
  }

  return metadata;
}
