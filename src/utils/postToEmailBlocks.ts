import * as Y from "yjs";
import * as base64 from "base64-js";
import { YJSFragmentToString } from "src/utils/yjsFragmentToString";
import type { Fact } from "src/replicache";
import { scanIndexLocal } from "src/replicache/utils";
import { getBlocksWithTypeLocal } from "src/replicache/getBlocks";
import type { Block } from "components/Blocks/Block";

export type EmailBlock =
  | {
      type: "text";
      plaintext: string;
      textSize?: "small" | "default" | "large";
    }
  | { type: "heading"; level: 1 | 2 | 3; plaintext: string }
  | { type: "blockquote"; plaintext: string }
  | { type: "code"; code: string; language?: string }
  | { type: "image"; src: string; alt?: string; width?: number; height?: number }
  | {
      type: "link";
      url: string;
      title?: string;
      description?: string;
      previewSrc?: string;
    }
  | { type: "horizontal-rule" }
  | { type: "list"; style: "ordered" | "unordered"; items: EmailListItem[] }
  | { type: "unsupported"; kind: string };

export type EmailListItem = {
  plaintext: string;
  checked?: boolean;
  children?: EmailBlock[];
};

function decodeYjsText(base64Value: string): string {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, base64.toByteArray(base64Value));
  const [node] = doc.getXmlElement("prosemirror").toArray();
  if (!node) return "";
  return YJSFragmentToString(node);
}

function getPlaintext(
  scan: ReturnType<typeof scanIndexLocal>,
  entity: string,
): string {
  const [content] = scan.eav(entity, "block/text");
  if (!content) return "";
  return decodeYjsText(content.data.value);
}

function renderBlock(
  scan: ReturnType<typeof scanIndexLocal>,
  block: Block,
): EmailBlock | null {
  switch (block.type) {
    case "text": {
      const [textSize] = scan.eav(block.value, "block/text-size");
      const out: EmailBlock = {
        type: "text",
        plaintext: getPlaintext(scan, block.value),
      };
      if (textSize) out.textSize = textSize.data.value;
      return out;
    }
    case "heading": {
      const [level] = scan.eav(block.value, "block/heading-level");
      const rawLevel = Math.floor(level?.data.value || 1);
      const clamped = (rawLevel < 1 ? 1 : rawLevel > 3 ? 3 : rawLevel) as
        | 1
        | 2
        | 3;
      return {
        type: "heading",
        level: clamped,
        plaintext: getPlaintext(scan, block.value),
      };
    }
    case "blockquote":
      return {
        type: "blockquote",
        plaintext: getPlaintext(scan, block.value),
      };
    case "code": {
      const [code] = scan.eav(block.value, "block/code");
      const [language] = scan.eav(block.value, "block/code-language");
      return {
        type: "code",
        code: code?.data.value || "",
        language: language?.data.value,
      };
    }
    case "image": {
      const [image] = scan.eav(block.value, "block/image");
      if (!image) return null;
      const [alt] = scan.eav(block.value, "image/alt");
      return {
        type: "image",
        src: image.data.src,
        alt: alt?.data.value,
        width: image.data.width,
        height: image.data.height,
      };
    }
    case "link": {
      const [url] = scan.eav(block.value, "link/url");
      if (!url) return null;
      const [title] = scan.eav(block.value, "link/title");
      const [description] = scan.eav(block.value, "link/description");
      const [preview] = scan.eav(block.value, "link/preview");
      return {
        type: "link",
        url: url.data.value,
        title: title?.data.value,
        description: description?.data.value,
        previewSrc: preview?.data.src,
      };
    }
    case "horizontal-rule":
      return { type: "horizontal-rule" };
    default:
      return { type: "unsupported", kind: block.type };
  }
}

type ListNode = {
  block: Block;
  children: ListNode[];
};

function buildListTree(blocks: Block[]): ListNode[] {
  // Build a nested tree from the flattened list output of getBlocksWithTypeLocal,
  // using listData.depth to re-nest.
  const roots: ListNode[] = [];
  const stack: ListNode[] = [];
  for (const b of blocks) {
    const depth = b.listData?.depth ?? 1;
    const node: ListNode = { block: b, children: [] };
    while (stack.length && (stack[stack.length - 1].block.listData?.depth ?? 1) >= depth) {
      stack.pop();
    }
    if (stack.length === 0) roots.push(node);
    else stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return roots;
}

function nodeToListItem(
  scan: ReturnType<typeof scanIndexLocal>,
  node: ListNode,
): EmailListItem {
  const item: EmailListItem = {
    plaintext: getPlaintext(scan, node.block.value),
  };
  if (node.block.listData?.checklist) {
    item.checked = node.block.listData.checked ?? false;
  }
  if (node.children.length > 0) {
    // Split children by list style into runs, each a nested list block
    const childBlocks: EmailBlock[] = [];
    let run: ListNode[] = [];
    let runStyle: "ordered" | "unordered" | null = null;
    const flushRun = () => {
      if (run.length === 0 || !runStyle) return;
      childBlocks.push({
        type: "list",
        style: runStyle,
        items: run.map((n) => nodeToListItem(scan, n)),
      });
      run = [];
      runStyle = null;
    };
    for (const child of node.children) {
      const style =
        child.block.listData?.listStyle === "ordered" ? "ordered" : "unordered";
      if (runStyle && runStyle !== style) flushRun();
      runStyle = style;
      run.push(child);
    }
    flushRun();
    item.children = childBlocks;
  }
  return item;
}

export function extractEmailBlocksFromFacts(
  facts: Fact<any>[],
  rootEntity: string,
): EmailBlock[] {
  const scan = scanIndexLocal(facts);
  const [firstPage] = scan.eav(rootEntity, "root/page");
  if (!firstPage) return [];

  const [pageType] = scan.eav(firstPage.data.value, "page/type");
  if (pageType?.data.value === "canvas") {
    // Canvas pages aren't sensibly mappable to a linear email; fall back.
    return [{ type: "unsupported", kind: "canvas-page" }];
  }

  const rawBlocks = getBlocksWithTypeLocal(facts, firstPage.data.value);

  // Walk the flattened blocks. Group consecutive list blocks into list runs.
  const out: EmailBlock[] = [];
  let listBuf: Block[] = [];

  const flushList = () => {
    if (listBuf.length === 0) return;
    const tree = buildListTree(listBuf);
    // Split roots by list style into separate list blocks
    let run: ListNode[] = [];
    let runStyle: "ordered" | "unordered" | null = null;
    const flushRun = () => {
      if (run.length === 0 || !runStyle) return;
      out.push({
        type: "list",
        style: runStyle,
        items: run.map((n) => nodeToListItem(scan, n)),
      });
      run = [];
      runStyle = null;
    };
    for (const rootNode of tree) {
      const style =
        rootNode.block.listData?.listStyle === "ordered"
          ? "ordered"
          : "unordered";
      if (runStyle && runStyle !== style) flushRun();
      runStyle = style;
      run.push(rootNode);
    }
    flushRun();
    listBuf = [];
  };

  for (const block of rawBlocks) {
    if (block.listData) {
      listBuf.push(block);
      continue;
    }
    flushList();
    const rendered = renderBlock(scan, block);
    if (rendered) out.push(rendered);
  }
  flushList();

  return out;
}
