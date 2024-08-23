import { ReadTransaction, Replicache } from "replicache";
import { ReplicacheMutators } from "src/replicache";
import { scanIndex } from "src/replicache/utils";
import { renderToStaticMarkup } from "react-dom/server";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { RenderYJSFragment } from "components/Blocks/TextBlock/RenderYJSFragment";
import { Block } from "components/Blocks";

export async function getBlocksAsHTML(
  rep: Replicache<ReplicacheMutators>,
  selectedBlocks: Block[],
) {
  let data = await rep?.query(async (tx) => {
    let result: string[] = [];
    let parsed = parseBlocks(selectedBlocks);
    for (let pb of parsed) {
      if (pb.type === "block") result.push(await renderBlock(pb.block, tx));
      else
        result.push(
          `<ul>${(
            await Promise.all(
              pb.children.map(async (c) => await renderList(c, tx)),
            )
          ).join("\n")}
          </ul>`,
        );
    }
    return result;
  });
  return data;
}

async function renderList(l: List, tx: ReadTransaction): Promise<string> {
  let children = (
    await Promise.all(l.children.map(async (c) => await renderList(c, tx)))
  ).join("\n");
  return `<li>${await renderBlock(l.block, tx, true)} ${
    l.children.length > 0
      ? `
  <ul>${children}</ul>
  `
      : ""
  }</li>`;
}

async function renderBlock(
  b: Block,
  tx: ReadTransaction,
  ignoreWrapper?: boolean,
) {
  let wrapper: undefined | "h1" | "h2" | "h3";
  if (b.type === "image") {
    let [src] = await scanIndex(tx).eav(b.value, "block/image");
    if (!src) return "";
    return renderToStaticMarkup(<img src={src.data.src} />);
  }
  if (b.type === "heading") {
    let headingLevel = await scanIndex(tx).eav(b.value, "block/heading-level");
    wrapper = "h" + headingLevel[0].data.value;
  }
  let value = (await scanIndex(tx).eav(b.value, "block/text"))[0];
  if (!value)
    return ignoreWrapper ? "" : `<${wrapper || "p"}></${wrapper || "p"}>`;
  let doc = new Y.Doc();
  const update = base64.toByteArray(value.data.value);
  Y.applyUpdate(doc, update);
  let nodes = doc.getXmlElement("prosemirror").toArray();
  return renderToStaticMarkup(
    <RenderYJSFragment
      node={nodes[0]}
      wrapper={ignoreWrapper ? null : wrapper}
    />,
  );
}

function parseBlocks(blocks: Block[]) {
  let parsed: ParsedBlocks = [];
  for (let i = 0; i < blocks.length; i++) {
    let b = blocks[i];
    if (!b.listData) parsed.push({ type: "block", block: b });
    else {
      let previousBlock = parsed[parsed.length - 1];
      if (
        !previousBlock ||
        previousBlock.type !== "list" ||
        previousBlock.depth > b.listData.depth
      )
        parsed.push({
          type: "list",
          depth: b.listData.depth,
          children: [
            {
              type: "list",
              block: b,
              depth: b.listData.depth,
              children: [],
            },
          ],
        });
      else {
        let depth = b.listData.depth;
        if (depth === previousBlock.depth)
          previousBlock.children.push({
            type: "list",
            block: b,
            depth: b.listData.depth,
            children: [],
          });
        else {
          let parent =
            previousBlock.children[previousBlock.children.length - 1];
          while (depth > 1) {
            if (
              parent.children[parent.children.length - 1] &&
              parent.children[parent.children.length - 1].depth <
                b.listData.depth
            ) {
              parent = parent.children[parent.children.length - 1];
            }
            depth -= 1;
          }
          parent.children.push({
            type: "list",
            block: b,
            depth: b.listData.depth,
            children: [],
          });
        }
      }
    }
  }
  console.log(parsed);
  return parsed;
}

type ParsedBlocks = Array<
  | { type: "block"; block: Block }
  | { type: "list"; depth: number; children: List[] }
>;

type List = {
  type: "list";
  block: Block;
  depth: number;
  children: List[];
};
