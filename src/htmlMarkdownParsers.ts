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

export function markdownToHtml(markdown: string): string {
  markdown = markdown.replace(/\n(?=[^\n])/g, "\n\n");
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
