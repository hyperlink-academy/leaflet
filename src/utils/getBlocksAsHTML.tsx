import { ReadTransaction, Replicache } from "replicache";
import type { Fact, ReplicacheMutators } from "src/replicache";
import { scanIndex } from "src/replicache/utils";
import { renderToStaticMarkup } from "react-dom/server";
import { RenderYJSFragment } from "components/Blocks/TextBlock/RenderYJSFragment";
import { Block } from "components/Blocks/Block";
import { List, parseBlocksToList } from "./parseBlocksToList";
import Katex from "katex";

export async function getBlocksAsHTML(
  rep: Replicache<ReplicacheMutators>,
  selectedBlocks: Block[],
) {
  let data = await rep?.query(async (tx) => {
    let result: string[] = [];
    let parsed = parseBlocksToList(selectedBlocks);
    for (let pb of parsed) {
      if (pb.type === "block") result.push(await renderBlock(pb.block, tx));
      else {
        // Check if the first child is an ordered list
        let isOrdered = pb.children[0]?.block.listData?.listStyle === "ordered";
        let tag = isOrdered ? "ol" : "ul";
        result.push(
          `<${tag}>${(
            await Promise.all(
              pb.children.map(async (c) => await renderList(c, tx)),
            )
          ).join("\n")}
          </${tag}>`,
        );
      }
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

  // Check if nested children are ordered or unordered
  let isOrdered = l.children[0]?.block.listData?.listStyle === "ordered";
  let tag = isOrdered ? "ol" : "ul";

  return `<li ${checked ? `data-checked=${checked.data.value}` : ""}>${await renderBlock(l.block, tx)} ${
    l.children.length > 0
      ? `
  <${tag}>${children}</${tag}>
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

const BlockTypeToHTML: {
  [K in Fact<"block/type">["data"]["value"]]: (
    b: Block,
    tx: ReadTransaction,
    alignment?: Fact<"block/text-alignment">["data"]["value"],
  ) => Promise<React.ReactNode>;
} = {
  datetime: async () => null,
  rsvp: async () => null,
  mailbox: async () => null,
  poll: async () => null,
  embed: async () => null,
  "bluesky-post": async () => null,
  math: async (b, tx, a) => {
    let [math] = await scanIndex(tx).eav(b.value, "block/math");
    const html = Katex.renderToString(math?.data.value || "", {
      displayMode: true,
      throwOnError: false,
      macros: {
        "\\f": "#1f(#2)",
      },
    });
    return renderToStaticMarkup(
      <div
        data-type="math"
        data-tex={math?.data.value}
        data-alignment={a}
        dangerouslySetInnerHTML={{ __html: html }}
      />,
    );
  },
  "horizontal-rule": async () => <hr />,
  image: async (b, tx, a) => {
    let [src] = await scanIndex(tx).eav(b.value, "block/image");
    if (!src) return "";
    return <img src={src.data.src} data-alignment={a} />;
  },
  code: async (b, tx, a) => {
    let [code] = await scanIndex(tx).eav(b.value, "block/code");
    let [lang] = await scanIndex(tx).eav(b.value, "block/code-language");
    return <pre data-lang={lang?.data.value}>{code?.data.value || ""}</pre>;
  },
  button: async (b, tx, a) => {
    let [text] = await scanIndex(tx).eav(b.value, "button/text");
    let [url] = await scanIndex(tx).eav(b.value, "button/url");
    if (!text || !url) return "";
    return (
      <a href={url.data.value} data-type="button" data-alignment={a}>
        {text.data.value}
      </a>
    );
  },
  blockquote: async (b, tx, a) => {
    let [value] = await scanIndex(tx).eav(b.value, "block/text");
    return (
      <RenderYJSFragment
        value={value?.data.value}
        attrs={{
          "data-alignment": a,
        }}
        wrapper={"blockquote"}
      />
    );
  },
  heading: async (b, tx, a) => {
    let [value] = await scanIndex(tx).eav(b.value, "block/text");
    let [headingLevel] = await scanIndex(tx).eav(
      b.value,
      "block/heading-level",
    );
    let wrapper = ("h" + (headingLevel?.data.value || 1)) as "h1" | "h2" | "h3";
    return (
      <RenderYJSFragment
        value={value?.data.value}
        attrs={{
          "data-alignment": a,
        }}
        wrapper={wrapper}
      />
    );
  },
  link: async (b, tx, a) => {
    let [url] = await scanIndex(tx).eav(b.value, "link/url");
    let [title] = await scanIndex(tx).eav(b.value, "link/title");
    if (!url) return "";
    return (
      <a href={url.data.value} target="_blank">
        {title.data.value}
      </a>
    );
  },
  card: async (b, tx, a) => {
    let [card] = await scanIndex(tx).eav(b.value, "block/card");
    let facts = await getAllFacts(tx, card.data.value);
    return (
      <div
        data-type="card"
        data-facts={JSON.stringify(facts)}
        data-entityid={card.data.value}
      />
    );
  },
  text: async (b, tx, a) => {
    let [value] = await scanIndex(tx).eav(b.value, "block/text");
    let [textSize] = await scanIndex(tx).eav(b.value, "block/text-size");

    return (
      <RenderYJSFragment
        value={value?.data.value}
        attrs={{
          "data-alignment": a,
          "data-text-size": textSize?.data.value,
        }}
        wrapper="p"
      />
    );
  },
};

async function renderBlock(b: Block, tx: ReadTransaction) {
  let [alignment] = await scanIndex(tx).eav(b.value, "block/text-alignment");
  let toHtml = BlockTypeToHTML[b.type];
  let element = await toHtml(b, tx, alignment?.data.value);
  return renderToStaticMarkup(element);
}
