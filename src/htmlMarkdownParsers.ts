import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkStringify from "remark-stringify";

export function markdownToHtml(markdown: string): string {
  return String(
    unified()
      .use(remarkParse) // Parse markdown content to a syntax tree
      .use(remarkRehype) // Turn markdown syntax tree to HTML syntax tree, ignoring embedded HTML
      .use(rehypeStringify) // Serialize HTML syntax tree
      .processSync(markdown)
  );
}

export function htmlToMarkdown(html: string): string {
  return String(
    unified()
      .use(rehypeParse) // Parse HTML to a syntax tree
      .use(rehypeRemark) // Turn HTML syntax tree to markdown syntax tree
      .use(
        remarkStringify, // Serialize HTML syntax tree
        {
          bullet: "-", // change default list marker from '*'
        }
      )
      .processSync(html)
  );
}
