"use server";

import * as Y from "yjs";
import * as base64 from "base64-js";
import { createOauthClient } from "src/atproto-oauth";
import { getIdentityData } from "actions/getIdentityData";
import {
  AtpBaseClient,
  PubLeafletBlocksHeader,
  PubLeafletBlocksText,
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
} from "lexicons/src";
import { Block } from "components/Blocks/Block";
import { TID } from "@atproto/common";
import { supabaseServerClient } from "supabase/serverClient";
import { scanIndex, scanIndexLocal } from "src/replicache/utils";
import { Fact } from "src/replicache";
import { Attributes } from "src/replicache/attributes";
import { YJSFragmentToString } from "components/Blocks/TextBlock/RenderYJSFragment";
import { ids } from "lexicons/src/lexicons";
import { OmitKey } from "lexicons/src/util";
import { BlobRef } from "@atproto/lexicon";
import { IdResolver } from "@atproto/identity";

const idResolver = new IdResolver();
export async function publishToPublication(
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
  let images = blocks
    .filter((b) => b.type === "image")
    .map((b) => scan.eav(b.value, "block/image")[0]);
  let imageMap = new Map<string, BlobRef>();
  await Promise.all(
    images.map(async (b) => {
      let data = await fetch(b.data.src);
      let binary = await data.blob();
      let blob = await agent.com.atproto.repo.uploadBlob(binary, {
        headers: { "Content-Type": binary.type },
      });
      console.log(blob);
      imageMap.set(b.data.src, blob.data.blob);
    }),
  );

  let title = "Untitled";
  let titleBlock = blocks.find((f) => f.type === "heading");
  if (titleBlock) title = getBlockContent(titleBlock.value);
  let b: PubLeafletPagesLinearDocument.Block[] = blocks.flatMap((b) => {
    if (b.type !== "text" && b.type !== "heading" && b.type !== "image")
      return [];
    if (b.type === "heading") {
      let [headingLevel] = scan.eav(b.value, "block/heading-level");

      let stringValue = getBlockContent(b.value);
      return [
        {
          $type: "pub.leaflet.pages.linearDocument#block",
          block: {
            $type: "pub.leaflet.blocks.header",
            level: headingLevel?.data.value || 1,
            plaintext: stringValue,
          },
        } as PubLeafletPagesLinearDocument.Block,
      ];
    }

    if (b.type == "text") {
      let stringValue = getBlockContent(b.value);
      return [
        {
          $type: "pub.leaflet.pages.linearDocument#block",
          block: {
            $type: ids.PubLeafletBlocksText,
            plaintext: stringValue,
          },
        },
      ];
    }
    if (b.type == "image") {
      let [image] = scan.eav(b.value, "block/image");
      if (!image) return [];
      let blobref = imageMap.get(image.data.src);
      if (!blobref) return [];
      return [
        {
          $type: "pub.leaflet.pages.linearDocument#block",
          block: {
            $type: "pub.leaflet.blocks.image",
            image: blobref,
            aspectRatio: {
              height: image.data.height,
              width: image.data.width,
            },
          },
        },
      ];
    }
    return [];
  });

  let record: OmitKey<PubLeafletDocument.Record, "$type"> = {
    author: credentialSession.did!,
    title,
    publication: publication_uri,
    pages: [
      {
        $type: "pub.leaflet.pages.linearDocument",
        blocks: b,
      },
    ],
  };
  let rkey = TID.nextStr();
  let result = await agent.pub.leaflet.document.create(
    { repo: credentialSession.did!, rkey, validate: false },
    record,
  );
  let handle = await idResolver.did.resolve(credentialSession.did!);
  return { handle, rkey };
}
