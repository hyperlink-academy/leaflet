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
  PubLeafletPagesCanvas,
  PubLeafletRichtextFacet,
  PubLeafletBlocksWebsite,
  PubLeafletBlocksCode,
  PubLeafletBlocksMath,
  PubLeafletBlocksHorizontalRule,
  PubLeafletBlocksBskyPost,
  PubLeafletBlocksBlockquote,
  PubLeafletBlocksIframe,
  PubLeafletBlocksPage,
  PubLeafletBlocksPoll,
  PubLeafletBlocksButton,
  PubLeafletPollDefinition,
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
import { Lock } from "src/utils/lock";
import type { PubLeafletPublication } from "lexicons/api";
import {
  ColorToRGB,
  ColorToRGBA,
} from "components/ThemeManager/colorToLexicons";
import Color from "colorjs.io/types";
import { parseColor } from "react-aria-components";

export async function publishToPublication({
  root_entity,
  publication_uri,
  leaflet_id,
  title,
  description,
  entitiesToDelete,
}: {
  root_entity: string;
  publication_uri?: string;
  leaflet_id: string;
  title?: string;
  description?: string;
  entitiesToDelete?: string[];
}) {
  const oauthClient = await createOauthClient();
  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) throw new Error("No Identity");

  let credentialSession = await oauthClient.restore(identity.atp_did);
  let agent = new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession),
  );

  // Check if we're publishing to a publication or standalone
  let draft: any = null;
  let existingDocUri: string | null = null;

  if (publication_uri) {
    // Publishing to a publication - use leaflets_in_publications
    let { data } = await supabaseServerClient
      .from("leaflets_in_publications")
      .select("*, publications(*), documents(*)")
      .eq("publication", publication_uri)
      .eq("leaflet", leaflet_id)
      .single();
    if (!data || identity.atp_did !== data?.publications?.identity_did)
      throw new Error("No draft or not publisher");
    draft = data;
    existingDocUri = draft?.doc;
  } else {
    // Publishing standalone - use leaflets_to_documents
    let { data } = await supabaseServerClient
      .from("leaflets_to_documents")
      .select("*, documents(*)")
      .eq("leaflet", leaflet_id)
      .single();
    draft = data;
    existingDocUri = draft?.document;
  }

  let { data } = await supabaseServerClient.rpc("get_facts", {
    root: root_entity,
  });
  let facts = (data as unknown as Fact<Attribute>[]) || [];

  let { firstPageBlocks, pages } = await processBlocksToPages(
    facts,
    agent,
    root_entity,
    credentialSession.did!,
  );

  let existingRecord =
    (draft?.documents?.data as PubLeafletDocument.Record | undefined) || {};

  // Extract theme for standalone documents (not for publications)
  let theme: PubLeafletPublication.Theme | undefined;
  if (!publication_uri) {
    theme = await extractThemeFromFacts(facts, root_entity, agent);
  }

  let record: PubLeafletDocument.Record = {
    publishedAt: new Date().toISOString(),
    ...existingRecord,
    $type: "pub.leaflet.document",
    author: credentialSession.did!,
    ...(publication_uri && { publication: publication_uri }),
    ...(theme && { theme }),
    title: title || "Untitled",
    description: description || "",
    pages: [
      {
        $type: "pub.leaflet.pages.linearDocument",
        blocks: firstPageBlocks,
      },
      ...pages.map((p) => {
        if (p.type === "canvas") {
          return {
            $type: "pub.leaflet.pages.canvas" as const,
            id: p.id,
            blocks: p.blocks as PubLeafletPagesCanvas.Block[],
          };
        } else {
          return {
            $type: "pub.leaflet.pages.linearDocument" as const,
            id: p.id,
            blocks: p.blocks as PubLeafletPagesLinearDocument.Block[],
          };
        }
      }),
    ],
  };

  // Keep the same rkey if updating an existing document
  let rkey = existingDocUri ? new AtUri(existingDocUri).rkey : TID.nextStr();
  let { data: result } = await agent.com.atproto.repo.putRecord({
    rkey,
    repo: credentialSession.did!,
    collection: record.$type,
    record,
    validate: false, //TODO publish the lexicon so we can validate!
  });

  // Optimistically create database entries
  await supabaseServerClient.from("documents").upsert({
    uri: result.uri,
    data: record as Json,
  });

  if (publication_uri) {
    // Publishing to a publication - update both tables
    await Promise.all([
      supabaseServerClient.from("documents_in_publications").upsert({
        publication: publication_uri,
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

    // Heuristic: Remove title entities if this is the first time publishing
    // (when coming from a standalone leaflet with entitiesToDelete passed in)
    if (entitiesToDelete && entitiesToDelete.length > 0 && !existingDocUri) {
      await supabaseServerClient
        .from("entities")
        .delete()
        .in("id", entitiesToDelete);
    }
  } else {
    // Publishing standalone - update leaflets_to_documents
    await supabaseServerClient.from("leaflets_to_documents").upsert({
      leaflet: leaflet_id,
      document: result.uri,
      title: title || "Untitled",
      description: description || "",
    });

    // Heuristic: Remove title entities if this is the first time publishing standalone
    // (when entitiesToDelete is provided and there's no existing document)
    if (entitiesToDelete && entitiesToDelete.length > 0 && !existingDocUri) {
      await supabaseServerClient
        .from("entities")
        .delete()
        .in("id", entitiesToDelete);
    }
  }

  return { rkey, record: JSON.parse(JSON.stringify(record)) };
}

async function processBlocksToPages(
  facts: Fact<any>[],
  agent: AtpBaseClient,
  root_entity: string,
  did: string,
) {
  let scan = scanIndexLocal(facts);
  let pages: {
    id: string;
    blocks:
      | PubLeafletPagesLinearDocument.Block[]
      | PubLeafletPagesCanvas.Block[];
    type: "doc" | "canvas";
  }[] = [];

  // Create a lock to serialize image uploads
  const uploadLock = new Lock();

  let firstEntity = scan.eav(root_entity, "root/page")?.[0];
  if (!firstEntity) throw new Error("No root page");
  let blocks = getBlocksWithTypeLocal(facts, firstEntity?.data.value);
  let b = await blocksToRecord(blocks, did);
  return { firstPageBlocks: b, pages };

  async function uploadImage(src: string) {
    let data = await fetch(src);
    if (data.status !== 200) return;
    let binary = await data.blob();
    return uploadLock.withLock(async () => {
      let blob = await agent.com.atproto.repo.uploadBlob(binary, {
        headers: { "Content-Type": binary.type },
      });
      return blob.data.blob;
    });
  }
  async function blocksToRecord(
    blocks: Block[],
    did: string,
  ): Promise<PubLeafletPagesLinearDocument.Block[]> {
    let parsedBlocks = parseBlocksToList(blocks);
    return (
      await Promise.all(
        parsedBlocks.map(async (blockOrList) => {
          if (blockOrList.type === "block") {
            let alignmentValue = scan.eav(
              blockOrList.block.value,
              "block/text-alignment",
            )[0]?.data.value;
            let alignment: ExcludeString<
              PubLeafletPagesLinearDocument.Block["alignment"]
            > =
              alignmentValue === "center"
                ? "lex:pub.leaflet.pages.linearDocument#textAlignCenter"
                : alignmentValue === "right"
                  ? "lex:pub.leaflet.pages.linearDocument#textAlignRight"
                  : alignmentValue === "justify"
                    ? "lex:pub.leaflet.pages.linearDocument#textAlignJustify"
                    : alignmentValue === "left"
                      ? "lex:pub.leaflet.pages.linearDocument#textAlignLeft"
                      : undefined;
            let b = await blockToRecord(blockOrList.block, did);
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
                children: await childrenToRecord(blockOrList.children, did),
              },
            };
            return [block];
          }
        }),
      )
    ).flat();
  }

  async function childrenToRecord(children: List[], did: string) {
    return (
      await Promise.all(
        children.map(async (child) => {
          let content = await blockToRecord(child.block, did);
          if (!content) return [];
          let record: PubLeafletBlocksUnorderedList.ListItem = {
            $type: "pub.leaflet.blocks.unorderedList#listItem",
            content,
            children: await childrenToRecord(child.children, did),
          };
          return record;
        }),
      )
    ).flat();
  }
  async function blockToRecord(b: Block, did: string) {
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
    if (b.type === "card") {
      let [page] = scan.eav(b.value, "block/card");
      if (!page) return;
      let [pageType] = scan.eav(page.data.value, "page/type");

      if (pageType?.data.value === "canvas") {
        let canvasBlocks = await canvasBlocksToRecord(page.data.value, did);
        pages.push({
          id: page.data.value,
          blocks: canvasBlocks,
          type: "canvas",
        });
      } else {
        let blocks = getBlocksWithTypeLocal(facts, page.data.value);
        pages.push({
          id: page.data.value,
          blocks: await blocksToRecord(blocks, did),
          type: "doc",
        });
      }

      let block: $Typed<PubLeafletBlocksPage.Main> = {
        $type: "pub.leaflet.blocks.page",
        id: page.data.value,
      };
      return block;
    }

    if (b.type === "bluesky-post") {
      let [post] = scan.eav(b.value, "block/bluesky-post");
      if (!post || !post.data.value.post) return;
      let block: $Typed<PubLeafletBlocksBskyPost.Main> = {
        $type: ids.PubLeafletBlocksBskyPost,
        postRef: {
          uri: post.data.value.post.uri,
          cid: post.data.value.post.cid,
        },
      };
      return block;
    }
    if (b.type === "horizontal-rule") {
      let block: $Typed<PubLeafletBlocksHorizontalRule.Main> = {
        $type: ids.PubLeafletBlocksHorizontalRule,
      };
      return block;
    }

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

    if (b.type === "blockquote") {
      let [stringValue, facets] = getBlockContent(b.value);
      let block: $Typed<PubLeafletBlocksBlockquote.Main> = {
        $type: ids.PubLeafletBlocksBlockquote,
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
    if (b.type === "embed") {
      let [url] = scan.eav(b.value, "embed/url");
      let [height] = scan.eav(b.value, "embed/height");
      if (!url) return;
      let block: $Typed<PubLeafletBlocksIframe.Main> = {
        $type: "pub.leaflet.blocks.iframe",
        url: url.data.value,
        height: height?.data.value || 600,
      };
      return block;
    }
    if (b.type == "image") {
      let [image] = scan.eav(b.value, "block/image");
      if (!image) return;
      let [altText] = scan.eav(b.value, "image/alt");
      let blobref = await uploadImage(image.data.src);
      if (!blobref) return;
      let block: $Typed<PubLeafletBlocksImage.Main> = {
        $type: "pub.leaflet.blocks.image",
        image: blobref,
        aspectRatio: {
          height: image.data.height,
          width: image.data.width,
        },
        alt: altText ? altText.data.value : undefined,
      };
      return block;
    }
    if (b.type === "link") {
      let [previewImage] = scan.eav(b.value, "link/preview");
      let [description] = scan.eav(b.value, "link/description");
      let [src] = scan.eav(b.value, "link/url");
      if (!src) return;
      let blobref = previewImage
        ? await uploadImage(previewImage?.data.src)
        : undefined;
      let [title] = scan.eav(b.value, "link/title");
      let block: $Typed<PubLeafletBlocksWebsite.Main> = {
        $type: "pub.leaflet.blocks.website",
        previewImage: blobref,
        src: src.data.value,
        description: description?.data.value,
        title: title?.data.value,
      };
      return block;
    }
    if (b.type === "code") {
      let [language] = scan.eav(b.value, "block/code-language");
      let [code] = scan.eav(b.value, "block/code");
      let [theme] = scan.eav(root_entity, "theme/code-theme");
      let block: $Typed<PubLeafletBlocksCode.Main> = {
        $type: "pub.leaflet.blocks.code",
        language: language?.data.value,
        plaintext: code?.data.value || "",
        syntaxHighlightingTheme: theme?.data.value,
      };
      return block;
    }
    if (b.type === "math") {
      let [math] = scan.eav(b.value, "block/math");
      let block: $Typed<PubLeafletBlocksMath.Main> = {
        $type: "pub.leaflet.blocks.math",
        tex: math?.data.value || "",
      };
      return block;
    }
    if (b.type === "poll") {
      // Get poll options from the entity
      let pollOptions = scan.eav(b.value, "poll/options");
      let options: PubLeafletPollDefinition.Option[] = pollOptions.map(
        (opt) => {
          let optionName = scan.eav(opt.data.value, "poll-option/name")?.[0];
          return {
            $type: "pub.leaflet.poll.definition#option",
            text: optionName?.data.value || "",
          };
        },
      );

      // Create the poll definition record
      let pollRecord: PubLeafletPollDefinition.Record = {
        $type: "pub.leaflet.poll.definition",
        name: "Poll", // Default name, can be customized
        options,
      };

      // Upload the poll record
      let { data: pollResult } = await agent.com.atproto.repo.putRecord({
        //use the entity id as the rkey so we can associate it in the editor
        rkey: b.value,
        repo: did,
        collection: pollRecord.$type,
        record: pollRecord,
        validate: false,
      });

      // Optimistically write poll definition to database
      console.log(
        await supabaseServerClient.from("atp_poll_records").upsert({
          uri: pollResult.uri,
          cid: pollResult.cid,
          record: pollRecord as Json,
        }),
      );

      // Return a poll block with reference to the poll record
      let block: $Typed<PubLeafletBlocksPoll.Main> = {
        $type: "pub.leaflet.blocks.poll",
        pollRef: {
          uri: pollResult.uri,
          cid: pollResult.cid,
        },
      };
      return block;
    }
    if (b.type === "button") {
      let [text] = scan.eav(b.value, "button/text");
      let [url] = scan.eav(b.value, "button/url");
      if (!text || !url) return;
      let block: $Typed<PubLeafletBlocksButton.Main> = {
        $type: "pub.leaflet.blocks.button",
        text: text.data.value,
        url: url.data.value,
      };
      return block;
    }
    return;
  }

  async function canvasBlocksToRecord(
    pageID: string,
    did: string,
  ): Promise<PubLeafletPagesCanvas.Block[]> {
    let canvasBlocks = scan.eav(pageID, "canvas/block");
    return (
      await Promise.all(
        canvasBlocks.map(async (canvasBlock) => {
          let blockEntity = canvasBlock.data.value;
          let position = canvasBlock.data.position;

          // Get the block content
          let blockType = scan.eav(blockEntity, "block/type")?.[0];
          if (!blockType) return null;

          let block: Block = {
            type: blockType.data.value,
            value: blockEntity,
            parent: pageID,
            position: "",
            factID: canvasBlock.id,
          };

          let content = await blockToRecord(block, did);
          if (!content) return null;

          // Get canvas-specific properties
          let width =
            scan.eav(blockEntity, "canvas/block/width")?.[0]?.data.value || 360;
          let rotation = scan.eav(blockEntity, "canvas/block/rotation")?.[0]
            ?.data.value;

          let canvasBlockRecord: PubLeafletPagesCanvas.Block = {
            $type: "pub.leaflet.pages.canvas#block",
            block: content,
            x: Math.floor(position.x),
            y: Math.floor(position.y),
            width: Math.floor(width),
            ...(rotation !== undefined && { rotation: Math.floor(rotation) }),
          };

          return canvasBlockRecord;
        }),
      )
    ).filter((b): b is PubLeafletPagesCanvas.Block => b !== null);
  }
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

      if (d.attributes?.code)
        facet.features.push({ $type: "pub.leaflet.richtext.facet#code" });
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

type ExcludeString<T> = T extends string
  ? string extends T
    ? never
    : T /* maybe literal, not the whole `string` */
  : T; /* not a string */

async function extractThemeFromFacts(
  facts: Fact<any>[],
  root_entity: string,
  agent: AtpBaseClient,
): Promise<PubLeafletPublication.Theme | undefined> {
  let scan = scanIndexLocal(facts);
  let pageBackground = scan.eav(root_entity, "theme/page-background")?.[0]?.data
    .value;
  let cardBackground = scan.eav(root_entity, "theme/card-background")?.[0]?.data
    .value;
  let primary = scan.eav(root_entity, "theme/primary")?.[0]?.data.value;
  let accentBackground = scan.eav(root_entity, "theme/accent-background")?.[0]
    ?.data.value;
  let accentText = scan.eav(root_entity, "theme/accent-text")?.[0]?.data.value;
  let showPageBackground = !scan.eav(
    root_entity,
    "theme/card-border-hidden",
  )?.[0]?.data.value;
  let backgroundImage = scan.eav(root_entity, "theme/background-image")?.[0];
  let backgroundImageRepeat = scan.eav(
    root_entity,
    "theme/background-image-repeat",
  )?.[0];

  let theme: PubLeafletPublication.Theme = {
    showPageBackground: showPageBackground ?? true,
  };

  if (pageBackground)
    theme.backgroundColor = ColorToRGBA(parseColor(`hsba(${pageBackground})`));
  if (cardBackground)
    theme.pageBackground = ColorToRGBA(parseColor(`hsba(${cardBackground})`));
  if (primary) theme.primary = ColorToRGB(parseColor(`hsba(${primary})`));
  if (accentBackground)
    theme.accentBackground = ColorToRGB(
      parseColor(`hsba(${accentBackground})`),
    );
  if (accentText)
    theme.accentText = ColorToRGB(parseColor(`hsba(${accentText})`));

  // Upload background image if present
  if (backgroundImage?.data) {
    let imageData = await fetch(backgroundImage.data.src);
    if (imageData.status === 200) {
      let binary = await imageData.blob();
      let blob = await agent.com.atproto.repo.uploadBlob(binary, {
        headers: { "Content-Type": binary.type },
      });

      theme.backgroundImage = {
        $type: "pub.leaflet.theme.backgroundImage",
        image: blob.data.blob,
        repeat: backgroundImageRepeat?.data.value ? true : false,
        ...(backgroundImageRepeat?.data.value && {
          width: backgroundImageRepeat.data.value,
        }),
      };
    }
  }

  // Only return theme if at least one property is set
  if (Object.keys(theme).length > 1 || theme.showPageBackground !== true) {
    return theme;
  }

  return undefined;
}
