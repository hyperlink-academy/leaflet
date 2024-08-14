import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

import { visit } from "unist-util-visit";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkStringify from "remark-stringify";

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
  return String(
    unified()
      .use(remarkParse) // Parse markdown content to a syntax tree
      .use(remarkGfm)
      .use(remarkRehype) // Turn markdown syntax tree to HTML syntax tree, ignoring embedded HTML
      .use(rehypeStringify) // Serialize HTML syntax tree
      .processSync(markdown),
  );
}

export function htmlToMarkdown(html: string): string {
  return String(
    unified()
      .use(rehypeParse) // Parse HTML to a syntax tree
      .use(rehypeRemark) // Turn HTML syntax tree to markdown syntax tree
      .use(remarkGfm)
      .use(remarkTightListify)
      .use(remarkStringify, {
        bullet: "-", // change default list marker from '*'
      }) // Serialize HTML syntax tree
      .processSync(html),
  );
}
