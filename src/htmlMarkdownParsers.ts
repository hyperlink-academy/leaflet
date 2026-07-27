import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

import { visit } from "unist-util-visit";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkStringify from "remark-stringify";
import remarkMath from "remark-math";
import type { Element } from "hast";

// Math blocks live in HTML as <div data-tex> (see getBlocksAsHTML / math block
// paste). We don't render KaTeX in this pipeline; instead we bridge between
// that div and Markdown's "$$…$$" display math so math survives the text/plain
// clipboard path in both directions.

// markdown "$$…$$" → <div data-tex> (the shape the block paste handler expects)
function mathNodeToHast(_state: any, node: { value: string }): Element {
  return {
    type: "element",
    tagName: "div",
    properties: { dataType: "math", dataTex: node.value },
    children: [],
  };
}

// <div data-tex> → markdown math node; other divs unwrap to their children,
// which is hast-util-to-mdast's default behaviour for block containers.
function divToMathNode(state: any, node: any) {
  let tex = node.properties?.dataTex;
  if (typeof tex === "string" && tex.trim()) {
    return { type: "math", value: tex.trim(), meta: null };
  }
  return state.all(node);
}

function remarkTightListify() {
  return (tree: any) => {
    visit(tree, "list", (node) => {
      node.spread = false;
      for (const child of node.children) {
        if (child.type === "listItem") {
          child.spread = false;
        }
      }
    });
  };
}

// Pasted plain text is usually prose where every newline is meant as a
// paragraph break, so single newlines get expanded into blank lines. Markdown
// constructs that are defined by adjacent lines — fenced code, blockquotes,
// tables, setext headings — break apart if that expansion runs through them.
function expandSoftLineBreaks(markdown: string): string {
  const lines = markdown.split("\n");
  const out: string[] = [];
  const isQuote = (l: string) => /^\s{0,3}>/.test(l);
  const isTableRow = (l: string) => /^\s{0,3}\|/.test(l);
  const isSetextUnderline = (l: string) => /^\s{0,3}(=+|-{2,})\s*$/.test(l);
  let fence: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    out.push(line);
    const fenceMarker = line.match(/^\s{0,3}(`{3,}|~{3,})/)?.[1];
    if (fence) {
      if (fenceMarker && line.trim().startsWith(fence)) fence = null;
      continue;
    }
    if (fenceMarker) {
      fence = fenceMarker;
      continue;
    }
    const next = lines[i + 1];
    if (next === undefined || !next.trim() || !line.trim()) continue;
    if (isSetextUnderline(next)) continue;
    if (isQuote(line) && isQuote(next)) continue;
    if (isTableRow(line) && isTableRow(next)) continue;
    out.push("");
  }
  return out.join("\n");
}

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// remarkRehype runs without allowDangerousHtml, so every raw-HTML node in the
// source is discarded. That's fine for markup that carries no text of its own
// (a stray <br>, an inline <span> whose text remark keeps as a sibling), but a
// plain-text paste of actual HTML — copied out of a terminal or a code editor —
// would otherwise disappear entirely.
function rawHTMLWouldLoseText(markdown: string): boolean {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  let lost = false;
  visit(tree, "html", (node: { value?: string }) => {
    if ((node.value || "").replace(/<[^>]*>/g, "").trim()) lost = true;
  });
  return lost;
}

export function markdownToHtml(markdown: string): string {
  const source = markdown;
  if (rawHTMLWouldLoseText(source)) {
    return source
      .split("\n")
      .map((line) => `<p>${escapeHTML(line)}</p>`)
      .join("\n");
  }
  markdown = expandSoftLineBreaks(markdown);
  return String(
    unified()
      .use(remarkParse) // Parse markdown content to a syntax tree
      .use(remarkGfm)
      // singleDollarTextMath is off so prose like "$5 and $10" isn't parsed as
      // inline math; only display "$$…$$" becomes a math block.
      .use(remarkMath, { singleDollarTextMath: false })
      .use(remarkRehype, {
        handlers: { math: mathNodeToHast, inlineMath: mathNodeToHast },
      }) // Turn markdown syntax tree to HTML syntax tree, ignoring embedded HTML
      .use(rehypeStringify) // Serialize HTML syntax tree
      .processSync(markdown),
  );
}

export function htmlToMarkdown(html: string): string {
  return String(
    unified()
      .use(rehypeParse) // Parse HTML to a syntax tree
      .use(rehypeRemark, { handlers: { div: divToMathNode } }) // Turn HTML syntax tree to markdown syntax tree
      .use(remarkGfm)
      .use(remarkMath) // serialize math nodes back to "$$…$$"
      .use(remarkTightListify)
      .use(remarkStringify, {
        bullet: "-", // change default list marker from '*'
      }) // Serialize HTML syntax tree
      .processSync(html),
  );
}
