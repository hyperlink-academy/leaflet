import { ReadTransaction, Replicache } from "replicache";
import type { Fact, ReplicacheMutators } from "src/replicache";
import { scanIndex } from "src/replicache/utils";
import { renderToStaticMarkup } from "react-dom/server";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { RenderYJSFragment } from "components/Blocks/TextBlock/RenderYJSFragment";
import { Block } from "components/Blocks/Block";
import { getBlocksWithType } from "src/hooks/queries/useBlocks";

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
  let [checked] = await scanIndex(tx).eav(l.block.value, "block/check-list");
  return `<li ${checked ? `data-checked=${checked.data.value}` : ""}>${await renderBlock(l.block, tx, true)} ${
    l.children.length > 0
      ? `
  <ul>${children}</ul>
  `
      : ""
  }</li>`;
}

async function getAllFacts(
  tx: ReadTransaction,
  entity: string,
): Promise<Array<Fact<any>>> {
  let facts = await scanIndex(tx).eav(entity, "");
  let childFacts = (
    await Promise.all(
      facts.map((f) => {
        if (
          f.data.type === "reference" ||
          f.data.type === "ordered-reference" ||
          f.data.type === "spatial-reference"
        ) {
          return getAllFacts(tx, f.data.value);
        }
        return [];
      }),
    )
  ).flat();
  return [...facts, ...childFacts];
}

async function renderBlock(
  b: Block,
  tx: ReadTransaction,
  ignoreWrapper?: boolean,
) {
  let wrapper: undefined | "h1" | "h2" | "h3";
  let [alignment] = await scanIndex(tx).eav(b.value, "block/text-alignment");
  if (b.type === "image") {
    let [src] = await scanIndex(tx).eav(b.value, "block/image");
    if (!src) return "";
    return renderToStaticMarkup(
      <img src={src.data.src} data-alignment={alignment?.data.value} />,
    );
  }
  if (b.type === "button") {
    let [text] = await scanIndex(tx).eav(b.value, "button/text");
    let [url] = await scanIndex(tx).eav(b.value, "button/url");
    if (!text || !url) return "";
    return renderToStaticMarkup(
      <a
        href={url.data.value}
        data-type="button"
        data-alignment={alignment?.data.value}
      >
        {text.data.value}
      </a>,
    );
  }
  if (b.type === "heading") {
    let headingLevel =
      (await scanIndex(tx).eav(b.value, "block/heading-level"))[0]?.data
        .value || 1;
    wrapper = "h" + headingLevel;
  }
  if (b.type === "link") {
    let [url] = await scanIndex(tx).eav(b.value, "link/url");
    let [title] = await scanIndex(tx).eav(b.value, "link/title");
    if (!url) return "";
    return renderToStaticMarkup(
      <a href={url.data.value} target="_blank">
        {title.data.value}
      </a>,
    );
  }
  if (b.type === "card") {
    let [card] = await scanIndex(tx).eav(b.value, "block/card");
    let facts = await getAllFacts(tx, card.data.value);
    return renderToStaticMarkup(
      <div
        data-type="card"
        data-facts={btoa(JSON.stringify(facts))}
        data-entityID={card.data.value}
      />,
    );
  }
  if (b.type === "mailbox") {
    return renderToStaticMarkup(
      <div>
        <a href={window.location.href} target="_blank">
          View {b.type}
        </a>{" "}
        in Leaflet!
      </div>,
    );
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
      attrs={{
        "data-alignment": alignment?.data.value,
      }}
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
