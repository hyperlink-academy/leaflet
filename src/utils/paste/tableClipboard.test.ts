// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { Doc, applyUpdate } from "yjs";
import { toByteArray } from "base64-js";
import { YJSFragmentToString } from "src/utils/yjsFragmentToString";
import { htmlToMarkdown } from "src/htmlMarkdownParsers";
import { parseTableClipboard } from "./tableClipboard";
import { getBlocksAsHTML } from "src/utils/getBlocksAsHTML";
import { buildTableGraph } from "src/replicache/table";
import { v7 } from "uuid";
import type { ReadTransaction } from "replicache";

function plaintext(value: string) {
  if (!value) return "";
  const doc = new Doc();
  applyUpdate(doc, toByteArray(value));
  const result = YJSFragmentToString(
    doc.getXmlFragment("prosemirror").toArray()[0],
  );
  doc.destroy();
  return result;
}

describe("table clipboard", () => {
  test.each([
    [
      "editor HTML",
      "<pre><code>\tfoo\n\tbar\n\tbaz</code></pre>",
      "\tfoo\n\tbar\n\tbaz",
    ],
    ["plain indented code", "", "\tfoo\n\tbar\n\tbaz"],
    ["Markdown document", "", "# Title\n\nA\tword\n\n- List item"],
    ["single line of prose", "", "Name\tvalue"],
    ["HTML source", "", "<table><tr><td>Source</td></tr></table>"],
    [
      "non-table HTML with rectangular text",
      "<pre>x\ty\nz\tw</pre>",
      "x\ty\nz\tw",
    ],
  ])("does not reinterpret %s as a table", (_, html, plain) => {
    expect(parseTableClipboard(html, plain)).toBeNull();
  });

  const markdownTable = "| Plan | Price |\n| --- | ---: |\n| Basic | $5 |";
  const editorHtml =
    '<div><span style="color: blue">| Plan | Price |</span><br>| --- | ---: |<br>| Basic | $5 |</div>';

  test("recovers a standalone GFM table from a code editor's plain text", () => {
    const result = parseTableClipboard(editorHtml, markdownTable);
    expect(result).toMatchObject({
      header: true,
      alignments: ["left", "right"],
    });
    if (!result || result === "too-large") throw new Error("Expected a grid");
    expect(result.values.map((row) => row.map(plaintext))).toEqual([
      ["Plan", "Price"],
      ["Basic", "$5"],
    ]);
  });

  test.each(["Intro", "---", "```md"])(
    "leaves mixed Markdown on the normal paste path (%s)",
    (prefix) => {
      expect(
        parseTableClipboard(
          `<div>${prefix}</div>${editorHtml}`,
          `${prefix}\n\n${markdownTable}${prefix === "```md" ? "\n```" : ""}`,
        ),
      ).toBeNull();
    },
  );

  test("accepts a single TSV row only when the clipboard identifies it", () => {
    const result = parseTableClipboard("", "Name\tvalue", true);
    expect(result).toMatchObject({ normalized: false });
    if (!result || result === "too-large") throw new Error("Expected a grid");
    expect(result.values.map((row) => row.map(plaintext))).toEqual([
      ["Name", "value"],
    ]);
  });
  test("copies a selected table as semantic HTML and Markdown with rich cell content", async () => {
    const grid = parseTableClipboard(
      '<table><tr><th>Title</th><th align="right">Price</th></tr><tr><td><a href="https://example.test"><strong>Bolt</strong></a><br>Steel</td><td>$5</td></tr></table>',
      "",
    );
    if (!grid || grid === "too-large") throw new Error("Expected a grid");
    const table = v7();
    const axis = () => ({ entityID: v7(), factID: v7() });
    const graph = buildTableGraph({
      ...grid,
      table,
      rows: [axis(), axis()],
      columns: [axis(), axis()],
      style: "striped",
      borders: false,
    });
    const allFacts = graph.facts.map((fact) => ({ id: v7(), ...fact }));
    const tx = {
      scan({ prefix }: { prefix: string }) {
        return {
          toArray: async () =>
            allFacts.filter((fact) =>
              `${fact.entity}-${fact.attribute}`.startsWith(prefix),
            ),
        };
      },
    } as unknown as ReadTransaction;
    const rep = {
      query<T>(fn: (tx: ReadTransaction) => T) {
        return Promise.resolve(fn(tx));
      },
    } as Parameters<typeof getBlocksAsHTML>[0];
    const [html] = await getBlocksAsHTML(rep, [
      {
        type: "table",
        entityID: table,
        parent: v7(),
        position: "a0",
        factID: v7(),
      },
    ]);
    expect(html).toContain('scope="col"');
    expect(html).toContain("<strong>");
    expect(html).toContain('href="https://example.test"');
    expect(html).toContain('data-borders="false"');
    expect(html).not.toContain(table);
    expect(htmlToMarkdown(html)).toContain("https://example.test");
    const copied = parseTableClipboard(html, "");
    expect(copied).toMatchObject({
      style: "striped",
      borders: false,
      alignments: ["left", "right"],
      normalized: false,
    });
    if (!copied || copied === "too-large") throw new Error("Expected a grid");
    expect(plaintext(copied.values[1][0])).toBe("Bolt\nSteel");
  });
  test("imports a markdown table without leading pipes and retains alignment", () => {
    const result = parseTableClipboard(
      "",
      "Name | Price\n--- | ---:\nBolt | 12",
    );
    expect(result).toMatchObject({
      header: true,
      normalized: false,
      alignments: ["left", "right"],
    });
    if (!result || result === "too-large") throw new Error("Expected a grid");
    expect(result.values.map((row) => row.map(plaintext))).toEqual([
      ["Name", "Price"],
      ["Bolt", "12"],
    ]);
  });

  test("flattens spans and nested paragraphs while retaining links and formatting", () => {
    const result = parseTableClipboard(
      '<table><tr><th colspan="2">Title</th></tr><tr><td rowspan="2"><p>First</p><p><strong>Second</strong></p></td><td><a href="https://example.test">link</a></td></tr><tr><td>Last</td></tr></table>',
      "",
    );
    expect(result).toMatchObject({ header: true, normalized: true });
    if (!result || result === "too-large") throw new Error("Expected a grid");
    expect(result.values.map((row) => row.map(plaintext))).toEqual([
      ["Title", ""],
      ["First\nSecond", "link"],
      ["", "Last"],
    ]);
    const doc = new Doc();
    applyUpdate(doc, toByteArray(result.values[1][0]));
    expect(doc.getXmlFragment("prosemirror").toString()).toContain(
      "<strong>Second</strong>",
    );
    doc.destroy();
  });

  test("restores native appearance and retains line breaks in Markdown", () => {
    const html =
      '<table data-leaflet-table="1" data-style="striped" data-borders="false"><thead><tr><th>a | b</th><th align="center">center</th></tr></thead><tbody><tr><td><strong>bold</strong><br>line</td><td>next</td></tr></tbody></table>';
    expect(parseTableClipboard(html, "")).toMatchObject({
      header: true,
      style: "striped",
      borders: false,
      normalized: false,
      alignments: ["left", "center"],
    });
    const markdown = htmlToMarkdown(html);
    expect(markdown).toContain("a \\| b");
    expect(markdown).toContain("**bold**<br>line");
    const result = parseTableClipboard("", markdown);
    if (!result || result === "too-large") throw new Error("Expected a grid");
    expect(plaintext(result.values[1][0])).toBe("bold\nline");
  });

  test("accepts TSV and conservative quoted CSV", () => {
    const tsv = parseTableClipboard("", 'first\t"line\nbreak"\r\nsecond\tlast');
    const csv = parseTableClipboard("", '"first, field",second\nthird,"last"');
    if (!tsv || tsv === "too-large" || !csv || csv === "too-large")
      throw new Error("Expected grids");
    expect(tsv.values.map((row) => row.map(plaintext))).toEqual([
      ["first", "line\nbreak"],
      ["second", "last"],
    ]);
    expect(csv.values.map((row) => row.map(plaintext))).toEqual([
      ["first, field", "second"],
      ["third", "last"],
    ]);
    expect(parseTableClipboard("", "Alice, Bob\nCarol, Dave")).toBeNull();
    expect(parseTableClipboard("", '"first",second\nthird')).toBeNull();
  });

  test("checks the cell cap before encoding the grid", () => {
    const row = ["first", ...Array(99).fill("")].join("\t");
    expect(parseTableClipboard("", Array(11).fill(row).join("\n"))).toBe(
      "too-large",
    );
    const result = parseTableClipboard("", Array(10).fill(row).join("\n"));
    if (!result || result === "too-large") throw new Error("Expected a grid");
    expect(result.values).toHaveLength(10);
    expect(result.values[0]).toHaveLength(100);
    expect(
      parseTableClipboard(
        '<table><tr><td colspan="1000">a</td></tr>' +
          "<tr><td>b</td></tr>".repeat(5) +
          "</table>",
        "",
      ),
    ).toBe("too-large");
  });
});
