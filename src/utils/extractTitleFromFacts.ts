import * as base64 from "base64-js";
import { applyUpdate, Doc } from "yjs";
import { YJSFragmentToString } from "src/utils/yjsFragmentToString";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import { scanIndexLocal } from "src/replicache/utils";

export function extractTitleFromFacts(
  rootToken: string,
  facts: Fact<Attribute>[],
): string {
  const scan = scanIndexLocal(facts);
  const [root] = scan.eav(rootToken, "root/page");
  const rootEntity = root?.data.value || rootToken;

  const [pageType] = scan.eav(rootEntity, "page/type");
  const isCanvas = pageType?.data.value === "canvas";

  const rawBlocks = isCanvas
    ? scan.eav(rootEntity, "canvas/block").sort((a, b) => {
        if (a.data.position.y === b.data.position.y)
          return a.data.position.x - b.data.position.x;
        return a.data.position.y - b.data.position.y;
      })
    : scan.eav(rootEntity, "card/block").sort((a, b) => {
        if (a.data.position === b.data.position)
          return a.id > b.id ? 1 : -1;
        return a.data.position > b.data.position ? 1 : -1;
      });

  const blocks = rawBlocks
    .map((b) => {
      const type = scan.eav(b.data.value, "block/type")[0];
      if (
        !type ||
        (type.data.value !== "text" && type.data.value !== "heading")
      )
        return null;
      return b.data;
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  const firstBlock = blocks[0];
  if (!firstBlock) return "Untitled";

  const [content] = scan.eav(firstBlock.value, "block/text");
  if (!content) return "Untitled";

  const doc = new Doc();
  applyUpdate(doc, base64.toByteArray(content.data.value));
  const nodes = doc.getXmlElement("prosemirror").toArray();
  return YJSFragmentToString(nodes[0]) || "Untitled";
}
