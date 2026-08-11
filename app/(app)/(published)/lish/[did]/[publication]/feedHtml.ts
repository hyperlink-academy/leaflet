import { AtUri } from "@atproto/syntax";
import {
  PubLeafletBlocksOrderedList,
  PubLeafletBlocksText,
  PubLeafletBlocksUnorderedList,
  PubLeafletPagesLinearDocument,
  PubLeafletRichtextFacet,
} from "lexicons/api";
import { blobRefToSrc, POST_BODY_IMAGE_WIDTH } from "src/utils/blobRefToSrc";
import { atUriToUrl } from "src/utils/mentionUtils";
import { BlockHandlers, matchBlock } from "src/utils/blockDispatch";
import { extractFacetFeatures } from "src/utils/facetFeatures";
import { RichText } from "./[rkey]/Blocks/TextBlockCore";

// Feed readers render item content with their own HTML parser and stylesheet,
// so the site renderers (tailwind classes, inline styles, shiki markup) come
// out as unstyled soup in every reader. This serializer emits only portable
// semantic HTML — p/h1-h6/b/i/u/s/a/ul/ol/blockquote/pre/img — with no
// classes, so any consumer can style it.

type AnyBlock = PubLeafletPagesLinearDocument.Block["block"];
type AnyListItem =
  | PubLeafletBlocksUnorderedList.ListItem
  | PubLeafletBlocksOrderedList.ListItem;

type FeedRenderContext = {
  did: string;
  baseUrl: string;
  // Footnote content lives inline in each facet (contentPlaintext), so refs
  // render as plain <sup> numbers and the content collects here to append as
  // a numbered list at the end of the post.
  footnotes: { id: string; html: string }[];
  renderBlock: (block: AnyBlock) => string;
};

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] as string,
  );
}

// Mentions resolve to main-site-relative paths; custom domains don't serve
// /lish/*, so relative URLs absolutize against leaflet.pub.
function absolutize(url: string): string {
  return url.startsWith("/") ? `https://leaflet.pub${url}` : url;
}

export function blocksToFeedHtml(
  blocks: PubLeafletPagesLinearDocument.Block[],
  did: string,
  baseUrl: string,
): string {
  const ctx = createFeedRenderContext(did, baseUrl);
  let html = blocks
    .map((b) => ctx.renderBlock(b.block))
    .filter(Boolean)
    .join("\n");
  if (ctx.footnotes.length) {
    html += `\n<hr/>\n<ol>${ctx.footnotes.map((f) => `<li>${f.html}</li>`).join("")}</ol>`;
  }
  return html;
}

function createFeedRenderContext(
  did: string,
  baseUrl: string,
): FeedRenderContext {
  const ctx: FeedRenderContext = {
    did,
    baseUrl,
    footnotes: [],
    renderBlock: (block) => matchBlock(block, renderers, () => ""),
  };

  const image = (b: {
    image: { ref: any };
    alt?: string;
    aspectRatio?: { width: number; height: number };
  }) =>
    renderImage(
      blobRefToSrc(b.image.ref, ctx.did, ctx.baseUrl, {
        width: POST_BODY_IMAGE_WIDTH,
      }),
      b.alt,
      b.aspectRatio,
    );

  const renderers: BlockHandlers<string> = {
    "pub.leaflet.blocks.text": (b) =>
      `<p>${renderRichText(b.plaintext, b.facets, ctx)}</p>`,
    "pub.leaflet.blocks.header": (b) => {
      const level = Math.min(Math.max(b.level || 1, 1), 6);
      return `<h${level}>${renderRichText(b.plaintext, b.facets, ctx)}</h${level}>`;
    },
    "pub.leaflet.blocks.blockquote": (b) =>
      `<blockquote><p>${renderRichText(b.plaintext, b.facets, ctx)}</p></blockquote>`,
    "pub.leaflet.blocks.code": (b) => {
      const langClass = b.language
        ? ` class="language-${escapeHtml(b.language)}"`
        : "";
      return `<pre><code${langClass}>${escapeHtml(b.plaintext)}</code></pre>`;
    },
    // No portable way to render TeX in a feed; ship the source.
    "pub.leaflet.blocks.math": (b) =>
      `<pre><code class="language-latex">${escapeHtml(b.tex)}</code></pre>`,
    "pub.leaflet.blocks.horizontalRule": () => "<hr/>",
    "pub.leaflet.blocks.unorderedList": (b) => renderUnorderedList(b, ctx),
    "pub.leaflet.blocks.orderedList": (b) => renderOrderedList(b, ctx),
    "pub.leaflet.blocks.image": image,
    "pub.leaflet.blocks.imageGallery": (b) =>
      b.images.map(image).join("\n"),
    "pub.leaflet.blocks.website": (b) => {
      const label = b.title?.trim() || b.src;
      return `<p><a href="${escapeHtml(b.src)}">${escapeHtml(label)}</a></p>`;
    },
    "pub.leaflet.blocks.button": (b) =>
      `<p><a href="${escapeHtml(absolutize(b.url))}">${escapeHtml(b.text)}</a></p>`,
    "pub.leaflet.blocks.bskyPost": (b) => {
      try {
        const uri = new AtUri(b.postRef.uri);
        return `<p><a href="https://bsky.app/profile/${uri.host}/post/${uri.rkey}">View post on Bluesky</a></p>`;
      } catch {
        return "";
      }
    },
    "pub.leaflet.blocks.iframe": (b) =>
      b.url
        ? `<p><a href="${escapeHtml(b.url)}">${escapeHtml(b.url)}</a></p>`
        : "",
    // Interactive or app-specific blocks with no useful static form; readers
    // get them on the web.
    "pub.leaflet.blocks.html": () => "",
    "pub.leaflet.blocks.poll": () => "",
    "pub.leaflet.blocks.signup": () => "",
    "pub.leaflet.blocks.postsList": () => "",
    "pub.leaflet.blocks.standardSitePost": () => "",
    "pub.leaflet.blocks.standardSitePublication": () => "",
    "pub.leaflet.blocks.page": () => "",
    "pub.leaflet.blocks.membersOnlyDelimiter": () => "",
  };

  return ctx;
}

// Plain text of a post's text-bearing blocks, for the item <description>.
export function blocksToPlainText(
  blocks: PubLeafletPagesLinearDocument.Block[],
): string {
  return blocks
    .map((b) => blockPlainText(b.block))
    .filter(Boolean)
    .join("\n\n")
    .replace(/\u00A0/g, " ")
    .trim();
}

const richTextPlain = (b: { plaintext: string }) => b.plaintext.trim();
const plainTextExtractors: BlockHandlers<string> = {
  "pub.leaflet.blocks.text": richTextPlain,
  "pub.leaflet.blocks.header": richTextPlain,
  "pub.leaflet.blocks.blockquote": richTextPlain,
  "pub.leaflet.blocks.code": richTextPlain,
  "pub.leaflet.blocks.unorderedList": (b) => listItemsPlainText(b.children),
  "pub.leaflet.blocks.orderedList": (b) => listItemsPlainText(b.children),
  "pub.leaflet.blocks.website": () => "",
  "pub.leaflet.blocks.math": () => "",
  "pub.leaflet.blocks.image": () => "",
  "pub.leaflet.blocks.imageGallery": () => "",
  "pub.leaflet.blocks.horizontalRule": () => "",
  "pub.leaflet.blocks.bskyPost": () => "",
  "pub.leaflet.blocks.button": () => "",
  "pub.leaflet.blocks.iframe": () => "",
  "pub.leaflet.blocks.html": () => "",
  "pub.leaflet.blocks.poll": () => "",
  "pub.leaflet.blocks.signup": () => "",
  "pub.leaflet.blocks.postsList": () => "",
  "pub.leaflet.blocks.standardSitePost": () => "",
  "pub.leaflet.blocks.standardSitePublication": () => "",
  "pub.leaflet.blocks.page": () => "",
  "pub.leaflet.blocks.membersOnlyDelimiter": () => "",
};

function blockPlainText(block: AnyBlock): string {
  return matchBlock(block, plainTextExtractors, () => "");
}

function listItemsPlainText(items: AnyListItem[]): string {
  return items
    .map((item) => {
      let parts = [blockPlainText(item.content as AnyBlock)];
      if (item.children?.length) parts.push(listItemsPlainText(item.children));
      if ("orderedListChildren" in item && item.orderedListChildren)
        parts.push(listItemsPlainText(item.orderedListChildren.children));
      if ("unorderedListChildren" in item && item.unorderedListChildren)
        parts.push(listItemsPlainText(item.unorderedListChildren.children));
      return parts.filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n");
}

function renderImage(
  src: string,
  alt: string | undefined,
  aspectRatio: { width: number; height: number } | undefined,
): string {
  const dims = aspectRatio
    ? ` width="${aspectRatio.width}" height="${aspectRatio.height}"`
    : "";
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt || "")}"${dims}/>`;
}

// Takes the plain Main types (optional $type): nested *ListChildren fields
// carry them, and the $Typed blocks the handlers receive narrow to them.
function renderUnorderedList(
  block: PubLeafletBlocksUnorderedList.Main,
  ctx: FeedRenderContext,
): string {
  return `<ul>${renderListItems(block.children, "ul", ctx)}</ul>`;
}

function renderOrderedList(
  block: PubLeafletBlocksOrderedList.Main,
  ctx: FeedRenderContext,
): string {
  const start =
    block.startIndex && block.startIndex !== 1
      ? ` start="${block.startIndex}"`
      : "";
  return `<ol${start}>${renderListItems(block.children, "ol", ctx)}</ol>`;
}

function renderListItems(
  items: AnyListItem[],
  tag: "ul" | "ol",
  ctx: FeedRenderContext,
): string {
  return items
    .map((item) => {
      const content = PubLeafletBlocksText.isMain(item.content)
        ? renderRichText(item.content.plaintext, item.content.facets, ctx)
        : ctx.renderBlock(item.content as AnyBlock);
      const checkbox =
        item.checked === undefined ? "" : item.checked ? "☑ " : "☐ ";
      let nested = "";
      // Same-type nesting uses `children`; a list of the opposite type nests
      // via the *ListChildren field (children wins when both are present).
      if (item.children?.length) {
        nested = `<${tag}>${renderListItems(item.children, tag, ctx)}</${tag}>`;
      } else if ("orderedListChildren" in item && item.orderedListChildren) {
        nested = renderOrderedList(item.orderedListChildren, ctx);
      } else if ("unorderedListChildren" in item && item.unorderedListChildren) {
        nested = renderUnorderedList(item.unorderedListChildren, ctx);
      }
      return `<li>${checkbox}${content}${nested}</li>`;
    })
    .join("");
}

function renderRichText(
  plaintext: string,
  facets: PubLeafletRichtextFacet.Main[] | undefined,
  ctx: FeedRenderContext,
): string {
  let out = "";
  const richText = new RichText({ text: plaintext, facets: facets || [] });
  for (const segment of richText.segments()) {
    let text = escapeHtml(segment.text).replace(/\n/g, "<br/>");
    if (!segment.facet) {
      out += text;
      continue;
    }
    const f = extractFacetFeatures(segment.facet);
    if (f.footnote) {
      out += `<sup>${footnoteIndex(f.footnote, ctx)}</sup>`;
      continue;
    }
    if (f.code) text = `<code>${text}</code>`;
    if (f.bold) text = `<b>${text}</b>`;
    if (f.italic) text = `<i>${text}</i>`;
    if (f.underline) text = `<u>${text}</u>`;
    if (f.strikethrough) text = `<s>${text}</s>`;
    if (f.highlight) text = `<mark>${text}</mark>`;
    // f.id (deep-link anchors) has no feed rendering.
    const href = f.link
      ? f.link.uri.trim()
      : f.didMention
        ? `https://leaflet.pub/p/${f.didMention.did}`
        : f.atMention
          ? f.atMention.href || atUriToUrl(f.atMention.atURI)
          : undefined;
    if (href) text = `<a href="${escapeHtml(absolutize(href))}">${text}</a>`;
    out += text;
  }
  return out;
}

function footnoteIndex(
  footnote: PubLeafletRichtextFacet.Footnote,
  ctx: FeedRenderContext,
): number {
  const existing = ctx.footnotes.findIndex((f) => f.id === footnote.footnoteId);
  if (existing !== -1) return existing + 1;
  // Register before rendering content so a self-referential footnote can't
  // recurse forever.
  const entry = { id: footnote.footnoteId, html: "" };
  ctx.footnotes.push(entry);
  entry.html = renderRichText(
    footnote.contentPlaintext,
    footnote.contentFacets,
    ctx,
  );
  return ctx.footnotes.length;
}
