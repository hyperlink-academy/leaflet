"use server";

import * as Y from "yjs";
import * as base64 from "base64-js";
import { createOauthClient } from "src/atproto-oauth";
import { getIdentityData } from "actions/getIdentityData";
import {
  AtpBaseClient,
  PubLeafletBlocksHeader,
  PubLeafletBlocksImage,
  PubLeafletBlocksText,
  PubLeafletBlocksUnorderedList,
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
  PubLeafletRichtextFacet,
} from "lexicons/api";
import { Block } from "components/Blocks/Block";
import { TID } from "@atproto/common";
import { supabaseServerClient } from "supabase/serverClient";
import { scanIndexLocal } from "src/replicache/utils";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import {
  Delta,
  YJSFragmentToString,
} from "components/Blocks/TextBlock/RenderYJSFragment";
import { ids } from "lexicons/api/lexicons";
import { BlobRef } from "@atproto/lexicon";
import { AtUri } from "@atproto/syntax";
import { Json } from "supabase/database.types";
import { $Typed, UnicodeString } from "@atproto/api";
import { List, parseBlocksToList } from "src/utils/parseBlocksToList";
import { getBlocksWithTypeLocal } from "src/hooks/queries/useBlocks";

export async function publishToPublication({
  root_entity,
  publication_uri,
  leaflet_id,
  title,
  description,
}: {
  root_entity: string;
  publication_uri: string;
  leaflet_id: string;
  title?: string;
  description?: string;
}) {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) throw new Error("No Identity");

  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );
  let { data: draft } = await supabaseServerClient
    .from("leaflets_in_publications")
    .select("*, publications(*)")
    .eq("publication", publication_uri)
    .eq("leaflet", leaflet_id)
    .single();
  if (!draft || identity.atp_did !== draft?.publications?.identity_did)
    throw new Error("No draft or not publisher");
  let { data } = await supabaseServerClient.rpc("get_facts", {
    root: root_entity,
  });
  let facts = (data as unknown as Fact<Attribute>[]) || [];
  let scan = scanIndexLocal(facts);
  let firstEntity = scan.eav(root_entity, "root/page")?.[0];
  if (!firstEntity) throw new Error("No root page");
  let blocks = getBlocksWithTypeLocal(facts, firstEntity?.data.value);

  let images = blocks
    .filter((b) => b.type === "image")
    .map((b) => scan.eav(b.value, "block/image")[0]);
  let imageMap = new Map<string, BlobRef>();
  await Promise.all(
    images.map(async (b) => {
      let data = await fetch(b.data.src);
      if (data.status !== 200) return;
      let binary = await data.blob();
      let blob = await agent.com.atproto.repo.uploadBlob(binary, {
        headers: { "Content-Type": binary.type },
      });
      imageMap.set(b.data.src, blob.data.blob);
    }),
  );

  let b: PubLeafletPagesLinearDocument.Block[] = blocksToRecord(
    blocks,
    imageMap,
    scan,
  );

  let record: PubLeafletDocument.Record = {
    $type: "pub.leaflet.document",
    author: credentialSession.did!,
    title: title || "Untitled",
    publication: publication_uri,
    publishedAt: new Date().toISOString(),
    description: description || "",
    pages: [
      {
        $type: "pub.leaflet.pages.linearDocument",
        blocks: b,
      },
    ],
  };
  let rkey = draft?.doc ? new AtUri(draft.doc).rkey : TID.nextStr();
  let { data: result } = await agent.com.atproto.repo.putRecord({
    rkey,
    repo: credentialSession.did!,
    collection: record.$type,
    record,
    validate: false, //TODO publish the lexicon so we can validate!
  });

  await supabaseServerClient.from("documents").upsert({
    uri: result.uri,
    data: record as Json,
  });
  await Promise.all([
    //Optimistically put these in!
    supabaseServerClient.from("documents_in_publications").upsert({
      publication: record.publication,
      document: result.uri,
    }),
    supabaseServerClient
      .from("leaflets_in_publications")
      .update({
        doc: result.uri,
      })
      .eq("leaflet", leaflet_id)
      .eq("publication", publication_uri),
  ]);

  return { rkey, record: JSON.parse(JSON.stringify(record)) };
}

function blocksToRecord(
  blocks: Block[],
  imageMap: Map<string, BlobRef>,
  scan: ReturnType<typeof scanIndexLocal>,
): PubLeafletPagesLinearDocument.Block[] {
  let parsedBlocks = parseBlocksToList(blocks);
  return parsedBlocks.flatMap((blockOrList) => {
    if (blockOrList.type === "block") {
      let alignmentValue =
        scan.eav(blockOrList.block.value, "block/text-alignment")[0]?.data
          .value || "left";
      let alignment =
        alignmentValue === "center"
          ? "lex:pub.leaflet.pages.linearDocument#textAlignCenter"
          : alignmentValue === "right"
            ? "lex:pub.leaflet.pages.linearDocument#textAlignRight"
            : undefined;
      let b = blockToRecord(blockOrList.block, imageMap, scan);
      if (!b) return [];
      let block: PubLeafletPagesLinearDocument.Block = {
        $type: "pub.leaflet.pages.linearDocument#block",
        alignment,
        block: b,
      };
      return [block];
    } else {
      let block: PubLeafletPagesLinearDocument.Block = {
        $type: "pub.leaflet.pages.linearDocument#block",
        block: {
          $type: "pub.leaflet.blocks.unorderedList",
          children: childrenToRecord(blockOrList.children, imageMap, scan),
        },
      };
      return [block];
    }
  });
}

function childrenToRecord(
  children: List[],
  imageMap: Map<string, BlobRef>,
  scan: ReturnType<typeof scanIndexLocal>,
) {
  return children.flatMap((child) => {
    let content = blockToRecord(child.block, imageMap, scan);
    if (!content) return [];
    let record: PubLeafletBlocksUnorderedList.ListItem = {
      $type: "pub.leaflet.blocks.unorderedList#listItem",
      content,
      children: childrenToRecord(child.children, imageMap, scan),
    };
    return record;
  });
}
function blockToRecord(
  b: Block,
  imageMap: Map<string, BlobRef>,
  scan: ReturnType<typeof scanIndexLocal>,
) {
  const getBlockContent = (b: string) => {
    let [content] = scan.eav(b, "block/text");
    if (!content) return ["", [] as PubLeafletRichtextFacet.Main[]] as const;
    let doc = new Y.Doc();
    const update = base64.toByteArray(content.data.value);
    Y.applyUpdate(doc, update);
    let nodes = doc.getXmlElement("prosemirror").toArray();
    let stringValue = YJSFragmentToString(nodes[0]);
    let facets = YJSFragmentToFacets(nodes[0]);
    return [stringValue, facets] as const;
  };
  if (b.type !== "text" && b.type !== "heading" && b.type !== "image") return;
  let alignmentValue =
    scan.eav(b.value, "block/text-alignment")[0]?.data.value || "left";

  if (b.type === "heading") {
    let [headingLevel] = scan.eav(b.value, "block/heading-level");

    let [stringValue, facets] = getBlockContent(b.value);
    let block: $Typed<PubLeafletBlocksHeader.Main> = {
      $type: "pub.leaflet.blocks.header",
      level: headingLevel?.data.value || 1,
      plaintext: stringValue,
      facets,
    };
    return block;
  }

  if (b.type == "text") {
    let [stringValue, facets] = getBlockContent(b.value);
    let block: $Typed<PubLeafletBlocksText.Main> = {
      $type: ids.PubLeafletBlocksText,
      plaintext: stringValue,
      facets,
    };
    return block;
  }
  if (b.type == "image") {
    let [image] = scan.eav(b.value, "block/image");
    if (!image) return;
    let blobref = imageMap.get(image.data.src);
    if (!blobref) return;
    let block: $Typed<PubLeafletBlocksImage.Main> = {
      $type: "pub.leaflet.blocks.image",
      image: blobref,
      aspectRatio: {
        height: image.data.height,
        width: image.data.width,
      },
    };
    return block;
  }
  return;
}

async function sendPostToEmailSubscribers(
  publication_uri: string,
  post: { content: string; title: string },
) {
  let { data: publication } = await supabaseServerClient
    .from("publications")
    .select("*, subscribers_to_publications(*)")
    .eq("uri", publication_uri)
    .single();

  let res = await fetch("https://api.postmarkapp.com/email/batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": process.env.POSTMARK_API_KEY!,
    },
    body: JSON.stringify(
      publication?.subscribers_to_publications.map((sub) => ({
        Headers: [
          {
            Name: "List-Unsubscribe-Post",
            Value: "List-Unsubscribe=One-Click",
          },
          {
            Name: "List-Unsubscribe",
            Value: `<${"TODO"}/mail/unsubscribe?sub_id=${sub.identity}>`,
          },
        ],
        MessageStream: "broadcast",
        From: `${publication.name} <mailbox@leaflet.pub>`,
        Subject: post.title,
        To: sub.identity,
        HtmlBody: `
        <h1>${publication.name}</h1>
        <hr style="margin-top: 1em; margin-bottom: 1em;">
        ${post.content}
        <hr style="margin-top: 1em; margin-bottom: 1em;">
        This is a super alpha release! Ask Jared if you want to unsubscribe (sorry)
        `,
        TextBody: post.content,
      })),
    ),
  });
}

function YJSFragmentToFacets(
  node: Y.XmlElement | Y.XmlText | Y.XmlHook,
): PubLeafletRichtextFacet.Main[] {
  if (node.constructor === Y.XmlElement) {
    return node
      .toArray()
      .map((f) => YJSFragmentToFacets(f))
      .flat();
  }
  if (node.constructor === Y.XmlText) {
    let facets: PubLeafletRichtextFacet.Main[] = [];
    let delta = node.toDelta() as Delta[];
    let byteStart = 0;
    for (let d of delta) {
      let unicodestring = new UnicodeString(d.insert);
      let facet: PubLeafletRichtextFacet.Main = {
        index: {
          byteStart,
          byteEnd: byteStart + unicodestring.length,
        },
        features: [],
      };

      if (d.attributes?.strikethrough)
        facet.features.push({
          $type: "pub.leaflet.richtext.facet#strikethrough",
        });

      if (d.attributes?.highlight)
        facet.features.push({ $type: "pub.leaflet.richtext.facet#highlight" });
      if (d.attributes?.underline)
        facet.features.push({ $type: "pub.leaflet.richtext.facet#underline" });
      if (d.attributes?.strong)
        facet.features.push({ $type: "pub.leaflet.richtext.facet#bold" });
      if (d.attributes?.em)
        facet.features.push({ $type: "pub.leaflet.richtext.facet#italic" });
      if (d.attributes?.link)
        facet.features.push({
          $type: "pub.leaflet.richtext.facet#link",
          uri: d.attributes.link.href,
        });
      if (facet.features.length > 0) facets.push(facet);
      byteStart += unicodestring.length;
    }
    return facets;
  }
  return [];
}
