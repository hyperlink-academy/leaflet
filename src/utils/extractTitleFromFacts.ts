import * as base64 from "base64-js";
import { applyUpdate, Doc } from "yjs";
import { YJSFragmentToString } from "src/utils/yjsFragmentToString";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { scanIndexLocal } from "src/replicache/utils";
import { getPageReadingOrder } from "src/replicache/getBlocks";

export function extractTitleFromFacts(
  rootToken: string,
  facts: Fact<Attribute>[],
): string {
  const scan = scanIndexLocal(facts);
  const [root] = scan.eav(rootToken, "root/page");
  const rootEntity = root?.data.value || rootToken;

  const firstBlock = getPageReadingOrder(scan, rootEntity).find(
    (b) => b.type === "text" || b.type === "heading",
  )?.entityID;
  if (!firstBlock) return "Untitled";

  const [content] = scan.eav(firstBlock, "block/text");
  if (!content) return "Untitled";

  const doc = new Doc();
  applyUpdate(doc, base64.toByteArray(content.data.value));
  const nodes = doc.getXmlElement("prosemirror").toArray();
  return YJSFragmentToString(nodes[0]) || "Untitled";
}
