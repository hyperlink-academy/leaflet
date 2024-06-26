import { Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";
import { scanIndex } from "src/replicache/utils";
import { renderToStaticMarkup } from "react-dom/server";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { RenderYJSFragment } from "components/TextBlock/RenderYJSFragment";
import { Block } from "components/Blocks";

export async function getBlocksAsHTML(
  rep: Replicache<ReplicacheMutators>,
  selectedBlocks: Block[],
) {
  let data = await rep?.query(async (tx) => {
    let types = await Promise.all(
      selectedBlocks
        .sort((a, b) => {
          return a.position > b.position ? 1 : -1;
        })
        .map((b) => scanIndex(tx).eav(b.value, "block/type")),
    );
    let blocksWithData = Promise.all(
      types.flat().map(async (b) => {
        if (b.data.value === "text" || b.data.value === "heading") {
          let wrapper: undefined | "h1" | "h2" | "h3";
          if (b.data.value === "heading") {
            let headingLevel = await scanIndex(tx).eav(
              b.entity,
              "block/heading-level",
            );
            wrapper = "h" + headingLevel[0].data.value;
          }
          let value = await scanIndex(tx).eav(b.entity, "block/text");
          let doc = new Y.Doc();
          const update = base64.toByteArray(value[0].data.value);
          Y.applyUpdate(doc, update);
          let nodes = doc.getXmlElement("prosemirror").toArray();
          return renderToStaticMarkup(
            <RenderYJSFragment node={nodes[0]} wrapper={wrapper} />,
          );
        }
        return "";
      }),
    );
    return blocksWithData;
  });
  return data;
}
