import { DOMParser as ProseMirrorParser, type Node } from "prosemirror-model";
import { prosemirrorToYDoc } from "y-prosemirror";
import * as Y from "yjs";
import { fromByteArray } from "base64-js";
import { multiBlockSchema, schema } from "components/Blocks/TextBlock/schema";
import { markdownToHtml } from "src/htmlMarkdownParsers";
import { MAX_TABLE_CELLS, validTableSize } from "src/replicache/table";
import { normalizePastedHTML } from "./normalizePastedHTML";

type Alignment = "left" | "center" | "right";
export type TableGrid = {
  values: string[][];
  header: boolean;
  alignments: Alignment[];
  borders?: boolean;
  style?: "striped";
  normalized: boolean;
};
export type TableImport = TableGrid | "too-large" | null;

const cellParser = ProseMirrorParser.fromSchema(multiBlockSchema);
const safeLink = (href: string) =>
  /^(?:https?:|mailto:|tel:|[/?#])/i.test(href) &&
  !/[\u0000-\u001f\u007f]/.test(href);
const allowedInline = new Set([
  "a",
  "b",
  "br",
  "code",
  "del",
  "em",
  "i",
  "s",
  "span",
  "strike",
  "strong",
  "u",
]);
const ignored =
  "script,style,iframe,object,embed,svg,math,template,img,video,audio";

export function tableCellDocument(container: HTMLElement) {
  let normalized = !!container.querySelector(
    `font,[color],[face],${ignored},.footnote-ref,.comment-anchor,p,div,ul,ol,blockquote`,
  );
  container
    .querySelectorAll(ignored + ",.footnote-ref")
    .forEach((node) => node.remove());
  for (const element of Array.from(container.querySelectorAll("*"))) {
    const semanticStyles = [
      "font-weight",
      "font-style",
      "text-decoration",
      "text-decoration-line",
    ];
    if (element instanceof HTMLElement) {
      const style = element.style;
      for (const property of Array.from(style)) {
        if (semanticStyles.includes(property)) continue;
        if (
          !(
            element.matches(".highlight[data-color]") &&
            property === "background-color"
          ) &&
          !(element.matches("s,del") && property === "text-decoration-color") &&
          !(element.matches("a[href]") && property === "cursor")
        )
          normalized = true;
        style.removeProperty(property);
      }
    }
    if (element.matches(".comment-anchor")) element.removeAttribute("class");
    const href = element.getAttribute("href")?.trim();
    if (href && !safeLink(href)) {
      element.removeAttribute("href");
      normalized = true;
    }
  }
  const inline: Node[] = [];
  cellParser.parse(container).forEach((block) => {
    if (inline.length) inline.push(schema.nodes.hard_break.create());
    block.forEach((node) => {
      if (node.type.name !== "footnote")
        inline.push(schema.nodeFromJSON(node.toJSON()));
    });
  });
  return {
    document: schema.nodes.doc.create(
      null,
      schema.nodes.paragraph.create(null, inline),
    ),
    normalized,
  };
}

export function encodeTableCell(doc: Node) {
  if (!doc.firstChild?.content.size) return "";
  const ydoc = prosemirrorToYDoc(doc, "prosemirror");
  const encoded = fromByteArray(Y.encodeStateAsUpdate(ydoc));
  ydoc.destroy();
  return encoded;
}

function plainCell(value: string) {
  const inline = value
    .split(/\r\n?|\n/)
    .flatMap((part, i) => [
      ...(i ? [schema.nodes.hard_break.create()] : []),
      ...(part ? [schema.text(part)] : []),
    ]);
  return encodeTableCell(
    schema.nodes.doc.create(null, schema.nodes.paragraph.create(null, inline)),
  );
}

export function parseTableElement(table: HTMLTableElement): TableImport {
  const rows = Array.from(table.rows);
  if (!rows.length) return null;
  if (rows.length > MAX_TABLE_CELLS) return "too-large";
  const grid: (HTMLTableCellElement | null | undefined)[][] = rows.map(
    () => [],
  );
  const groupRemaining = Array(rows.length).fill(1) as number[];
  for (let i = rows.length - 2; i >= 0; i--) {
    if (rows[i].parentElement === rows[i + 1].parentElement)
      groupRemaining[i] += groupRemaining[i + 1];
  }
  let normalized = false;
  let width = 0;
  for (const [i, row] of rows.entries()) {
    let x = 0;
    for (const cell of Array.from(row.cells)) {
      while (grid[i][x] !== undefined) x++;
      const remaining = groupRemaining[i];
      const height = Math.min(cell.rowSpan || remaining, remaining);
      const span = cell.colSpan;
      width = Math.max(width, x + span);
      if (!validTableSize(rows.length, width)) return "too-large";
      normalized ||= height !== 1 || span !== 1 || cell.rowSpan !== 1;
      for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < span; dx++) {
          if (grid[i + dy][x + dx] !== undefined) normalized = true;
          else grid[i + dy][x + dx] = dx || dy ? null : cell;
        }
      }
      x += span;
    }
  }
  if (!width) return null;
  const values = grid.map((row) =>
    Array.from({ length: width }, (_, i) => {
      const cell = row[i];
      if (!cell) {
        normalized ||= cell === undefined;
        return "";
      }
      const copy = cell.cloneNode(true) as HTMLTableCellElement;
      if (copy.querySelector("table")) {
        copy
          .querySelectorAll("table")
          .forEach((nested) => nested.replaceWith(nested.textContent ?? ""));
        normalized = true;
      }
      const parsed = tableCellDocument(copy);
      normalized ||=
        parsed.normalized ||
        Array.from(copy.querySelectorAll("*")).some(
          (el) => !allowedInline.has(el.localName),
        );
      return encodeTableCell(parsed.document);
    }),
  );
  const native = table.getAttribute("data-leaflet-table") === "1";
  const header =
    rows[0].cells.length > 0 &&
    (rows[0].parentElement?.tagName === "THEAD" ||
      Array.from(rows[0].cells).every(
        (cell) => cell.tagName === "TH" && cell.scope !== "row",
      ));
  normalized ||= rows
    .slice(header ? 1 : 0)
    .some((row) => Array.from(row.cells).some((cell) => cell.tagName === "TH"));
  const alignments = Array.from({ length: width }, (_, i) => {
    const cell = grid.find((row) => row[i])?.[i];
    const value = cell?.getAttribute("align") || cell?.style.textAlign;
    return value === "center" || value === "right" ? value : "left";
  });
  return {
    values,
    header,
    alignments,
    normalized,
    ...(native &&
      table.getAttribute("data-style") === "striped" && { style: "striped" }),
    ...(native &&
      table.getAttribute("data-borders") === "false" && { borders: false }),
  };
}

// Spreadsheet text uses CSV-style quotes around fields with delimiters or
// newlines. A CSV grid additionally requires at least one quoted field.
function delimitedRows(text: string, delimiter: string) {
  const rows: string[][] = [[]];
  let field = "";
  let quoted = false;
  let closed = false;
  let sawQuote = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char !== '"') field += char;
      else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = false;
        closed = true;
      }
      continue;
    }
    if (char === delimiter || char === "\n" || char === "\r") {
      rows.at(-1)!.push(field);
      field = "";
      closed = false;
      if (char !== delimiter) {
        if (char === "\r" && text[i + 1] === "\n") i++;
        if (i + 1 === text.length) return { rows, sawQuote };
        rows.push([]);
      }
    } else if (closed) return null;
    else if (char === '"' && field === "") {
      quoted = true;
      sawQuote = true;
    } else field += char;
  }
  if (quoted) return null;
  rows.at(-1)!.push(field);
  return { rows, sawQuote };
}

export function parseTableClipboard(
  html: string,
  text: string,
  explicitTSV = false,
): TableImport {
  const parseBody = (markup: string) =>
    new DOMParser().parseFromString(markup, "text/html").body;
  const tableOnly = (body: HTMLElement) => {
    const tables = body.querySelectorAll("table");
    const table = tables[0];
    if (
      table &&
      !Array.from(tables).some(
        (other) => other !== table && !table.contains(other),
      ) &&
      body.textContent?.trim() === table.textContent?.trim() &&
      !Array.from(body.querySelectorAll("img,hr,input,video,iframe")).some(
        (node) => !table.contains(node),
      )
    ) {
      normalizePastedHTML(body);
      return parseTableElement(table);
    }
    return null;
  };
  if (/<table[\s>]/i.test(html)) {
    const body = parseBody(html);
    if (body.querySelector("table")) return tableOnly(body);
  }
  if (!explicitTSV && /<table[\s>]/i.test(text)) return null;
  if (!explicitTSV && text.includes("|")) {
    // Code editors often supply syntax-highlighted HTML alongside Markdown.
    // Recover a standalone GFM table from the plain text in that case.
    const body = parseBody(markdownToHtml(text));
    if (
      body.children.length === 1 &&
      body.firstElementChild?.matches("table") &&
      body.firstElementChild.querySelector("thead")
    )
      return tableOnly(body);
  }
  // Non-table HTML still wins over inferred delimiter-separated text.
  if (html.trim()) return null;
  const tsv = explicitTSV || text.includes("\t");
  if (!text || (!tsv && (!text.includes(",") || !text.includes('"'))))
    return null;
  const parsed = delimitedRows(text, tsv ? "\t" : ",");
  if (!parsed) return null;
  const { rows, sawQuote } = parsed;
  const width = rows.reduce((largest, row) => Math.max(largest, row.length), 0);
  const ragged = rows.some((row) => row.length !== width);
  if (
    !explicitTSV &&
    (rows.length < 2 || width < 2 || ragged || (!tsv && !sawQuote))
  )
    return null;
  // Leading empty columns are common in source indentation. Spreadsheet
  // transfers with intentional empty columns can provide the explicit MIME.
  if (tsv && !explicitTSV && rows.every((row) => row[0] === "")) return null;
  if (!validTableSize(rows.length, width)) return "too-large";
  return {
    values: rows.map((row) =>
      Array.from({ length: width }, (_, i) => plainCell(row[i] ?? "")),
    ),
    alignments: [],
    header: false,
    normalized: ragged,
  };
}
