"use server";

import * as Y from "yjs";
import * as base64 from "base64-js";
import { createOauthClient } from "src/atproto-oauth";
import { getIdentityData } from "actions/getIdentityData";
import { AtpBaseClient } from "lexicons/src";
import { Block } from "components/Blocks/Block";
import { TID } from "@atproto/common";
import { supabaseServerClient } from "supabase/serverClient";
import { scanIndexLocal } from "src/replicache/utils";
import { Fact } from "src/replicache";
import { Attributes } from "src/replicache/attributes";
import { YJSFragmentToString } from "components/Blocks/TextBlock/RenderYJSFragment";

export async function publishtoPublication(
  root_entity: string,
  blocks: Block[],
  publication_uri: string,
) {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return null;

  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let { data } = await supabaseServerClient.rpc("get_facts", {
    root: root_entity,
  });
  console.log(data);

  let scan = scanIndexLocal(
    (data as unknown as Fact<keyof typeof Attributes>[]) || [],
  );
  const getBlockContent = (b: string) => {
    let [content] = scan.eav(b, "block/text");
    if (!content) return "";
    let doc = new Y.Doc();
    const update = base64.toByteArray(content.data.value);
    Y.applyUpdate(doc, update);
    let nodes = doc.getXmlElement("prosemirror").toArray();
    let stringValue = YJSFragmentToString(nodes[0]);
    return stringValue;
  };

  let title = "Untitled";
  let titleBlock = blocks.find((f) => f.type === "heading");
  if (titleBlock) title = getBlockContent(titleBlock.value);

  let record = {
    author: credentialSession.did!,
    title,
    publication: publication_uri,
    pages: [
      {
        $type: "pub.leaflet.pages.linearDocument",
        blocks: blocks.flatMap((b) => {
          if (b.type !== "text" && b.type !== "heading") return [];
          let stringValue = getBlockContent(b.value);
          return [
            {
              $type: "pub.leaflet.pages.linearDocument#block",
              block: {
                $type: "pub.leaflet.blocks.text",
                plaintext: stringValue,
              },
            },
          ];
        }),
      },
    ],
  };
  let result = await agent.pub.leaflet.document.create(
    { repo: credentialSession.did!, rkey: TID.nextStr(), validate: false },
    record,
  );
  // I need to add this to the db, associate it with the account creating it, and then also add records that do stuff...
  console.log(result);
}
