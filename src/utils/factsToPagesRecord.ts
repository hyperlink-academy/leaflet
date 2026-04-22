import * as Y from "yjs";
import * as base64 from "base64-js";
import { $Typed, UnicodeString } from "@atproto/api";
import { BlobRef } from "@atproto/lexicon";

import {
  PubLeafletBlocksBlockquote,
  PubLeafletBlocksBskyPost,
  PubLeafletBlocksButton,
  PubLeafletBlocksCode,
  PubLeafletBlocksHeader,
  PubLeafletBlocksHorizontalRule,
  PubLeafletBlocksIframe,
  PubLeafletBlocksImage,
  PubLeafletBlocksMath,
  PubLeafletBlocksOrderedList,
  PubLeafletBlocksPage,
  PubLeafletBlocksPoll,
  PubLeafletBlocksText,
  PubLeafletBlocksUnorderedList,
  PubLeafletBlocksWebsite,
  PubLeafletPagesCanvas,
  PubLeafletPagesLinearDocument,
  PubLeafletPollDefinition,
  PubLeafletRichtextFacet,
} from "lexicons/api";
import { ids } from "lexicons/api/lexicons";

import { Block } from "components/Blocks/Block";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { scanIndexLocal } from "src/replicache/utils";
import { getBlocksWithTypeLocal } from "src/replicache/getBlocks";
import { List, parseBlocksToList } from "src/utils/parseBlocksToList";
import { Delta, YJSFragmentToString } from "src/utils/yjsFragmentToString";

type ExcludeString<T> = T extends string
  ? string extends T
    ? never
    : T
  : T;

export type ProcessBlocksToPagesHooks = {
  /**
   * Resolve an image URL to a BlobRef. For publish, this uploads the blob to
   * the user's PDS. For preview, this synthesizes a BlobRef that carries the
   * URL through to the email template (no PDS side-effects).
   * Returning undefined causes the image block to be dropped.
   */
  uploadImage: (src: string) => Promise<BlobRef | undefined>;

  /**
   * Persist a poll definition record and return its at-uri / CID. For
   * publish, this writes to the PDS and (optionally) Supabase. For preview,
   * pass null to skip poll blocks entirely — they'll be rendered as
   * "unsupported" in the email.
   */
  uploadPoll:
    | ((
        entityId: string,
        record: PubLeafletPollDefinition.Record,
      ) => Promise<{ uri: string; cid: string } | undefined>)
    | null;
};

export type ProcessBlocksToPagesResult = {
  pages: {
    id: string;
    blocks:
      | PubLeafletPagesLinearDocument.Block[]
      | PubLeafletPagesCanvas.Block[];
    type: "doc" | "canvas";
  }[];
};

export async function processBlocksToPages(opts: {
  facts: Fact<Attribute>[];
  root_entity: string;
  hooks: ProcessBlocksToPagesHooks;
}): Promise<ProcessBlocksToPagesResult> {
  const { facts, root_entity, hooks } = opts;
  const scan = scanIndexLocal(facts);
  const pages: ProcessBlocksToPagesResult["pages"] = [];

  const firstEntity = scan.eav(root_entity, "root/page")?.[0];
  if (!firstEntity) throw new Error("No root page");

  const [pageType] = scan.eav(firstEntity.data.value, "page/type");

  if (pageType?.data.value === "canvas") {
    const canvasBlocks = await canvasBlocksToRecord(firstEntity.data.value);
    pages.unshift({
      id: firstEntity.data.value,
      blocks: canvasBlocks,
      type: "canvas",
    });
  } else {
    const blocks = getBlocksWithTypeLocal(facts, firstEntity?.data.value);
    const b = await blocksToRecord(blocks);
    pages.unshift({
      id: firstEntity.data.value,
      blocks: b,
      type: "doc",
    });
  }

  return { pages };

  async function blocksToRecord(
    blocks: Block[],
  ): Promise<PubLeafletPagesLinearDocument.Block[]> {
    const parsedBlocks = parseBlocksToList(blocks);
    return (
      await Promise.all(
        parsedBlocks.map(async (blockOrList) => {
          if (blockOrList.type === "block") {
            const alignmentValue = scan.eav(
              blockOrList.block.value,
              "block/text-alignment",
            )[0]?.data.value;
            const alignment: ExcludeString<
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
            const b = await blockToRecord(blockOrList.block);
            if (!b) return [];
            const block: PubLeafletPagesLinearDocument.Block = {
              $type: "pub.leaflet.pages.linearDocument#block",
              block: b,
            };
            if (alignment) block.alignment = alignment;
            return [block];
          } else {
            const runs = splitListByStyle(blockOrList.children);
            const out = await Promise.all(
              runs.map(async (run) => {
                if (run.style === "ordered") {
                  const block: PubLeafletPagesLinearDocument.Block = {
                    $type: "pub.leaflet.pages.linearDocument#block",
                    block: {
                      $type: "pub.leaflet.blocks.orderedList",
                      startIndex:
                        run.children[0].block.listData?.listStart || 1,
                      children: await orderedChildrenToRecord(run.children),
                    },
                  };
                  return block;
                } else {
                  const block: PubLeafletPagesLinearDocument.Block = {
                    $type: "pub.leaflet.pages.linearDocument#block",
                    block: {
                      $type: "pub.leaflet.blocks.unorderedList",
                      children: await unorderedChildrenToRecord(run.children),
                    },
                  };
                  return block;
                }
              }),
            );
            return out;
          }
        }),
      )
    ).flat();
  }

  function splitListByStyle(children: List[]) {
    const runs: { style: "ordered" | "unordered"; children: List[] }[] = [];
    for (const child of children) {
      const style: "ordered" | "unordered" =
        child.block.listData?.listStyle === "ordered"
          ? "ordered"
          : "unordered";
      const last = runs[runs.length - 1];
      if (last && last.style === style) {
        last.children.push(child);
      } else {
        runs.push({ style, children: [child] });
      }
    }
    return runs;
  }

  async function unorderedChildrenToRecord(
    children: List[],
  ): Promise<PubLeafletBlocksUnorderedList.ListItem[]> {
    return (
      await Promise.all(
        children.map(async (child) => {
          const content = await blockToRecord(child.block);
          if (!content) return [];
          const record: PubLeafletBlocksUnorderedList.ListItem = {
            $type: "pub.leaflet.blocks.unorderedList#listItem",
            content,
            ...(child.block.listData?.checklist && {
              checked: child.block.listData.checked ?? false,
            }),
          };
          const sameStyle = child.children.filter(
            (c) => c.block.listData?.listStyle !== "ordered",
          );
          const diffStyle = child.children.filter(
            (c) => c.block.listData?.listStyle === "ordered",
          );
          if (sameStyle.length > 0) {
            record.children = await unorderedChildrenToRecord(sameStyle);
          }
          if (diffStyle.length > 0) {
            record.orderedListChildren = {
              $type: "pub.leaflet.blocks.orderedList",
              children: await orderedChildrenToRecord(diffStyle),
            };
          }
          return record;
        }),
      )
    ).flat();
  }

  async function orderedChildrenToRecord(
    children: List[],
  ): Promise<PubLeafletBlocksOrderedList.ListItem[]> {
    return (
      await Promise.all(
        children.map(async (child) => {
          const content = await blockToRecord(child.block);
          if (!content) return [];
          const record: PubLeafletBlocksOrderedList.ListItem = {
            $type: "pub.leaflet.blocks.orderedList#listItem",
            content,
            ...(child.block.listData?.checklist && {
              checked: child.block.listData.checked ?? false,
            }),
          };
          const sameStyle = child.children.filter(
            (c) => c.block.listData?.listStyle === "ordered",
          );
          const diffStyle = child.children.filter(
            (c) => c.block.listData?.listStyle !== "ordered",
          );
          if (sameStyle.length > 0) {
            record.children = await orderedChildrenToRecord(sameStyle);
          }
          if (diffStyle.length > 0) {
            record.unorderedListChildren = {
              $type: "pub.leaflet.blocks.unorderedList",
              children: await unorderedChildrenToRecord(diffStyle),
            };
          }
          return record;
        }),
      )
    ).flat();
  }

  async function blockToRecord(b: Block) {
    const footnoteContentResolver = (footnoteEntityID: string) => {
      const [content] = scan.eav(footnoteEntityID, "block/text");
      if (!content)
        return {
          plaintext: "",
          facets: [] as PubLeafletRichtextFacet.Main[],
        };
      const doc = new Y.Doc();
      const update = base64.toByteArray(content.data.value);
      Y.applyUpdate(doc, update);
      const nodes = doc.getXmlElement("prosemirror").toArray();
      const plaintext = YJSFragmentToString(nodes[0]);
      const { facets } = YJSFragmentToFacets(nodes[0]);
      return { plaintext, facets };
    };
    const getBlockContent = (b: string) => {
      const [content] = scan.eav(b, "block/text");
      if (!content)
        return ["", [] as PubLeafletRichtextFacet.Main[]] as const;
      const doc = new Y.Doc();
      const update = base64.toByteArray(content.data.value);
      Y.applyUpdate(doc, update);
      const nodes = doc.getXmlElement("prosemirror").toArray();
      const stringValue = YJSFragmentToString(nodes[0]);
      const { facets } = YJSFragmentToFacets(
        nodes[0],
        0,
        footnoteContentResolver,
      );
      return [stringValue, facets] as const;
    };
    if (b.type === "card") {
      const [page] = scan.eav(b.value, "block/card");
      if (!page) return;
      const [pageType] = scan.eav(page.data.value, "page/type");

      if (pageType?.data.value === "canvas") {
        const canvasBlocks = await canvasBlocksToRecord(page.data.value);
        pages.push({
          id: page.data.value,
          blocks: canvasBlocks,
          type: "canvas",
        });
      } else {
        const blocks = getBlocksWithTypeLocal(facts, page.data.value);
        pages.push({
          id: page.data.value,
          blocks: await blocksToRecord(blocks),
          type: "doc",
        });
      }

      const block: $Typed<PubLeafletBlocksPage.Main> = {
        $type: "pub.leaflet.blocks.page",
        id: page.data.value,
      };
      return block;
    }

    if (b.type === "bluesky-post") {
      const [post] = scan.eav(b.value, "block/bluesky-post");
      if (!post || !post.data.value.post) return;
      const [hostFact] = scan.eav(b.value, "bluesky-post/host");
      const block: $Typed<PubLeafletBlocksBskyPost.Main> = {
        $type: ids.PubLeafletBlocksBskyPost,
        postRef: {
          uri: post.data.value.post.uri,
          cid: post.data.value.post.cid,
        },
        clientHost: hostFact?.data.value,
      };
      return block;
    }
    if (b.type === "horizontal-rule") {
      const block: $Typed<PubLeafletBlocksHorizontalRule.Main> = {
        $type: ids.PubLeafletBlocksHorizontalRule,
      };
      return block;
    }

    if (b.type === "heading") {
      const [headingLevel] = scan.eav(b.value, "block/heading-level");

      const [stringValue, facets] = getBlockContent(b.value);
      const block: $Typed<PubLeafletBlocksHeader.Main> = {
        $type: "pub.leaflet.blocks.header",
        level: Math.floor(headingLevel?.data.value || 1),
        plaintext: stringValue,
        ...(facets.length > 0 && { facets }),
      };
      return block;
    }

    if (b.type === "blockquote") {
      const [stringValue, facets] = getBlockContent(b.value);
      const block: $Typed<PubLeafletBlocksBlockquote.Main> = {
        $type: ids.PubLeafletBlocksBlockquote,
        plaintext: stringValue,
        ...(facets.length > 0 && { facets }),
      };
      return block;
    }

    if (b.type == "text") {
      const [stringValue, facets] = getBlockContent(b.value);
      const [textSize] = scan.eav(b.value, "block/text-size");
      const block: $Typed<PubLeafletBlocksText.Main> = {
        $type: ids.PubLeafletBlocksText,
        plaintext: stringValue,
        ...(facets.length > 0 && { facets }),
        ...(textSize && { textSize: textSize.data.value }),
      };
      return block;
    }
    if (b.type === "embed") {
      const [url] = scan.eav(b.value, "embed/url");
      const [height] = scan.eav(b.value, "embed/height");
      const [aspectRatio] = scan.eav(b.value, "embed/aspect-ratio");
      if (!url) return;
      const block: $Typed<PubLeafletBlocksIframe.Main> = {
        $type: "pub.leaflet.blocks.iframe",
        url: url.data.value,
        height: Math.floor(height?.data.value || 600),
      };
      if (aspectRatio) {
        const [w, h] = aspectRatio.data.value.split("/").map(Number);
        if (w && h) {
          block.aspectRatio = { width: w, height: h };
        }
      }
      return block;
    }
    if (b.type == "image") {
      const [image] = scan.eav(b.value, "block/image");
      if (!image) return;
      const [altText] = scan.eav(b.value, "image/alt");
      const [fullBleed] = scan.eav(b.value, "image/full-bleed");
      const blobref = await hooks.uploadImage(image.data.src);
      if (!blobref) return;
      const block: $Typed<PubLeafletBlocksImage.Main> = {
        $type: "pub.leaflet.blocks.image",
        image: blobref,
        aspectRatio: {
          height: Math.floor(image.data.height),
          width: Math.floor(image.data.width),
        },
        alt: altText ? altText.data.value : undefined,
        fullBleed: fullBleed?.data.value || undefined,
      };
      return block;
    }
    if (b.type === "link") {
      const [previewImage] = scan.eav(b.value, "link/preview");
      const [description] = scan.eav(b.value, "link/description");
      const [src] = scan.eav(b.value, "link/url");
      if (!src) return;
      const blobref = previewImage
        ? await hooks.uploadImage(previewImage.data.src)
        : undefined;
      const [title] = scan.eav(b.value, "link/title");
      const block: $Typed<PubLeafletBlocksWebsite.Main> = {
        $type: "pub.leaflet.blocks.website",
        previewImage: blobref,
        src: src.data.value,
        description: description?.data.value,
        title: title?.data.value,
      };
      return block;
    }
    if (b.type === "code") {
      const [language] = scan.eav(b.value, "block/code-language");
      const [code] = scan.eav(b.value, "block/code");
      const [theme] = scan.eav(root_entity, "theme/code-theme");
      const block: $Typed<PubLeafletBlocksCode.Main> = {
        $type: "pub.leaflet.blocks.code",
        language: language?.data.value,
        plaintext: code?.data.value || "",
        syntaxHighlightingTheme: theme?.data.value,
      };
      return block;
    }
    if (b.type === "math") {
      const [math] = scan.eav(b.value, "block/math");
      const block: $Typed<PubLeafletBlocksMath.Main> = {
        $type: "pub.leaflet.blocks.math",
        tex: math?.data.value || "",
      };
      return block;
    }
    if (b.type === "poll") {
      if (!hooks.uploadPoll) return;

      const pollOptions = scan.eav(b.value, "poll/options");
      const options: PubLeafletPollDefinition.Option[] = pollOptions.map(
        (opt) => {
          const optionName = scan.eav(opt.data.value, "poll-option/name")?.[0];
          return {
            $type: "pub.leaflet.poll.definition#option",
            text: optionName?.data.value || "",
          };
        },
      );

      const pollRecord: PubLeafletPollDefinition.Record = {
        $type: "pub.leaflet.poll.definition",
        name: "Poll",
        options,
      };

      const result = await hooks.uploadPoll(b.value, pollRecord);
      if (!result) return;

      const block: $Typed<PubLeafletBlocksPoll.Main> = {
        $type: "pub.leaflet.blocks.poll",
        pollRef: {
          uri: result.uri,
          cid: result.cid,
        },
      };
      return block;
    }
    if (b.type === "button") {
      const [text] = scan.eav(b.value, "button/text");
      const [url] = scan.eav(b.value, "button/url");
      if (!text || !url) return;
      const block: $Typed<PubLeafletBlocksButton.Main> = {
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
  ): Promise<PubLeafletPagesCanvas.Block[]> {
    const canvasBlocks = scan.eav(pageID, "canvas/block");
    return (
      await Promise.all(
        canvasBlocks.map(async (canvasBlock) => {
          const blockEntity = canvasBlock.data.value;
          const position = canvasBlock.data.position;

          const blockType = scan.eav(blockEntity, "block/type")?.[0];
          if (!blockType) return null;

          const block: Block = {
            type: blockType.data.value,
            value: blockEntity,
            parent: pageID,
            position: "",
            factID: canvasBlock.id,
          };

          const content = await blockToRecord(block);
          if (!content) return null;

          const width =
            scan.eav(blockEntity, "canvas/block/width")?.[0]?.data.value || 360;
          const rotation = scan.eav(blockEntity, "canvas/block/rotation")?.[0]
            ?.data.value;

          const canvasBlockRecord: PubLeafletPagesCanvas.Block = {
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

export function YJSFragmentToFacets(
  node: Y.XmlElement | Y.XmlText | Y.XmlHook,
  byteOffset: number = 0,
  footnoteContentResolver?: (footnoteEntityID: string) => {
    plaintext: string;
    facets: PubLeafletRichtextFacet.Main[];
  },
): { facets: PubLeafletRichtextFacet.Main[]; byteLength: number } {
  if (node.constructor === Y.XmlElement) {
    if (node.nodeName === "footnote") {
      const footnoteEntityID = node.getAttribute("footnoteEntityID") || "";
      const placeholder = "*";
      const unicodestring = new UnicodeString(placeholder);
      const footnoteContent = footnoteContentResolver?.(footnoteEntityID);
      const facet: PubLeafletRichtextFacet.Main = {
        index: {
          byteStart: byteOffset,
          byteEnd: byteOffset + unicodestring.length,
        },
        features: [
          {
            $type: "pub.leaflet.richtext.facet#footnote",
            footnoteId: footnoteEntityID,
            contentPlaintext: footnoteContent?.plaintext || "",
            ...(footnoteContent?.facets?.length
              ? { contentFacets: footnoteContent.facets }
              : {}),
          },
        ],
      };
      return { facets: [facet], byteLength: unicodestring.length };
    }

    if (node.nodeName === "didMention") {
      const text = node.getAttribute("text") || "";
      const unicodestring = new UnicodeString(text);
      const facet: PubLeafletRichtextFacet.Main = {
        index: {
          byteStart: byteOffset,
          byteEnd: byteOffset + unicodestring.length,
        },
        features: [
          {
            $type: "pub.leaflet.richtext.facet#didMention",
            did: node.getAttribute("did"),
          },
        ],
      };
      return { facets: [facet], byteLength: unicodestring.length };
    }

    if (node.nodeName === "atMention") {
      const text = node.getAttribute("text") || "";
      const unicodestring = new UnicodeString(text);
      const facet: PubLeafletRichtextFacet.Main = {
        index: {
          byteStart: byteOffset,
          byteEnd: byteOffset + unicodestring.length,
        },
        features: [
          {
            $type: "pub.leaflet.richtext.facet#atMention",
            atURI: node.getAttribute("atURI"),
            ...(node.getAttribute("href")
              ? { href: node.getAttribute("href") }
              : {}),
          },
        ],
      };
      return { facets: [facet], byteLength: unicodestring.length };
    }

    if (node.nodeName === "hard_break") {
      const unicodestring = new UnicodeString("\n");
      return { facets: [], byteLength: unicodestring.length };
    }

    const allFacets: PubLeafletRichtextFacet.Main[] = [];
    let currentOffset = byteOffset;
    for (const child of node.toArray()) {
      const result = YJSFragmentToFacets(
        child,
        currentOffset,
        footnoteContentResolver,
      );
      allFacets.push(...result.facets);
      currentOffset += result.byteLength;
    }
    return { facets: allFacets, byteLength: currentOffset - byteOffset };
  }

  if (node.constructor === Y.XmlText) {
    const facets: PubLeafletRichtextFacet.Main[] = [];
    const delta = node.toDelta() as Delta[];
    let byteStart = byteOffset;
    let totalLength = 0;
    for (const d of delta) {
      const unicodestring = new UnicodeString(d.insert);
      const facet: PubLeafletRichtextFacet.Main = {
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
      totalLength += unicodestring.length;
    }
    return { facets, byteLength: totalLength };
  }
  return { facets: [], byteLength: 0 };
}
