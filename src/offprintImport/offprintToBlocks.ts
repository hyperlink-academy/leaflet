import {
  contentBuilder,
  escapeHtml,
  numberFact as number,
  stringFact as string,
  type ConvertedContent,
} from "src/import/content";
import {
  blobCid,
  type OffprintBlock,
  type OffprintBlob,
  type OffprintFacet,
  type OffprintGridImage,
  type OffprintListItem,
  type OffprintTaskItem,
  type OffprintTextBlock,
  type OffprintHeadingBlock,
} from "./offprintRecords";

// Records a document points at that have to be fetched before the synchronous
// conversion: inlined components and the Bluesky posts it embeds.
export type OffprintResolved = {
  components: Map<string, OffprintBlock[]>;
  blueskyThreads: Map<string, unknown>;
};

export function collectOffprintRefs(items: OffprintBlock[]): {
  components: string[];
  blueskyPosts: string[];
} {
  const components: string[] = [];
  const blueskyPosts: string[] = [];
  for (const item of items) {
    if (item.$type === "app.offprint.block.component")
      components.push((item as { component: string }).component);
    if (item.$type === "app.offprint.block.blueskyPost")
      blueskyPosts.push((item as { post: { uri: string } }).post.uri);
  }
  return { components, blueskyPosts };
}

// Offprint sizes images as a percentage of its content column; Leaflet stores
// a pixel width, so percentages are taken against the default page width
// (624px) minus its padding.
const CONTENT_WIDTH = 592;

// Facet byte offsets are over the UTF-8 encoding; map them onto UTF-16 string
// indices. Offsets that land inside a multi-byte character snap forward.
function byteToCharIndex(text: string): (byte: number) => number {
  const boundaries: number[] = [];
  let byte = 0;
  let char = 0;
  for (const cp of text) {
    const code = cp.codePointAt(0)!;
    const len = code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
    for (let i = 0; i < len; i++) boundaries[byte + i] = char;
    byte += len;
    char += cp.length;
  }
  boundaries[byte] = char;
  return (b: number) => boundaries[Math.min(Math.max(b, 0), byte)] ?? char;
}

type Tag = { open: string; close: string; order: number };

function featureTag(feature: OffprintFacet["features"][number]): Tag | null {
  const f = feature as {
    $type: string;
    uri?: string;
    did?: string;
    color?: string;
  };
  const link = (href: string): Tag => ({
    open: `<a href="${escapeHtml(href)}">`,
    close: "</a>",
    order: 0,
  });
  switch (f.$type) {
    case "app.offprint.richtext.facet#link":
    case "app.offprint.richtext.facet#webMention":
      return f.uri ? link(f.uri) : null;
    case "app.offprint.richtext.facet#mention":
      return f.did ? link(`https://bsky.app/profile/${f.did}`) : null;
    case "app.offprint.richtext.facet#code":
      return { open: "<code>", close: "</code>", order: 1 };
    case "app.offprint.richtext.facet#bold":
      return { open: "<strong>", close: "</strong>", order: 2 };
    case "app.offprint.richtext.facet#italic":
      return { open: "<em>", close: "</em>", order: 3 };
    case "app.offprint.richtext.facet#underline":
      return { open: "<u>", close: "</u>", order: 4 };
    case "app.offprint.richtext.facet#strikethrough":
      return { open: "<s>", close: "</s>", order: 5 };
    case "app.offprint.richtext.facet#highlight":
      return {
        open: `<span class="highlight" data-color="1">`,
        close: "</span>",
        order: 6,
      };
    default:
      // An unknown inline style loses its formatting but keeps its text.
      return null;
  }
}

// Render faceted plaintext as inline HTML, split into paragraphs at blank
// lines; a single newline becomes a hard break. Empty paragraphs are dropped.
export function facetsToParagraphs(
  text: string,
  facets: OffprintFacet[] | undefined,
): string[] {
  const toChar = byteToCharIndex(text);
  const marks = (facets ?? []).flatMap((facet) => {
    const start = toChar(facet.index.byteStart);
    const end = toChar(facet.index.byteEnd);
    if (end <= start) return [];
    return facet.features
      .map(featureTag)
      .filter((t): t is Tag => !!t)
      .map((tag) => ({ start, end, tag }));
  });
  const points = [
    ...new Set([0, text.length, ...marks.flatMap((m) => [m.start, m.end])]),
  ].sort((a, b) => a - b);

  const paragraphs: string[] = [];
  let current = "";
  let newlines = 0;
  const flush = () => {
    if (current) paragraphs.push(current);
    current = "";
  };
  for (let i = 0; i + 1 < points.length; i++) {
    const [a, b] = [points[i], points[i + 1]];
    const tags = marks
      .filter((m) => m.start <= a && m.end >= b)
      .map((m) => m.tag)
      .sort((x, y) => x.order - y.order);
    const pieces = text.slice(a, b).split("\n");
    pieces.forEach((piece, j) => {
      if (j > 0) newlines++;
      if (!piece) return;
      if (newlines >= 2) flush();
      else if (newlines === 1 && current) current += "<br>";
      newlines = 0;
      current +=
        tags.map((t) => t.open).join("") +
        escapeHtml(piece) +
        tags
          .map((t) => t.close)
          .reverse()
          .join("");
    });
  }
  flush();
  return paragraphs;
}

const alignAttr = (align: string | undefined) =>
  align && ["left", "center", "right"].includes(align)
    ? ` data-alignment="${align}"`
    : "";

function textHtml(block: OffprintTextBlock): string {
  return facetsToParagraphs(block.plaintext, block.facets)
    .map((p) => `<p${alignAttr(block.textAlign)}>${p}</p>`)
    .join("");
}

function headingHtml(block: OffprintHeadingBlock): string {
  const level = Math.min(Math.max(Math.round(block.level) || 1, 1), 3);
  const inner = facetsToParagraphs(block.plaintext, block.facets).join("<br>");
  return inner
    ? `<h${level}${alignAttr(block.textAlign)}>${inner}</h${level}>`
    : "";
}

function captionHtml(caption: string | undefined, facets?: OffprintFacet[]) {
  if (!caption?.trim()) return "";
  return facetsToParagraphs(caption, facets)
    .map((p) => `<p data-text-size="small">${p}</p>`)
    .join("");
}

function listHtml(
  tag: "ul" | "ol",
  items: Array<OffprintListItem | OffprintTaskItem>,
): string {
  const li = items
    .map((item) => {
      const checked = "checked" in item ? (item.checked ? "☑ " : "☐ ") : "";
      const body =
        checked +
        facetsToParagraphs(item.content.plaintext, item.content.facets).join(
          "<br>",
        );
      const nested = item.children?.length
        ? listHtml(tag, item.children as OffprintListItem[])
        : "";
      return `<li>${body}${nested}</li>`;
    })
    .join("");
  return `<${tag}>${li}</${tag}>`;
}

function cssWidthToPx(width: string | undefined): number | null {
  if (!width) return null;
  const pct = /^\s*([\d.]+)%\s*$/.exec(width);
  if (pct) {
    const n = Number(pct[1]);
    return n > 0 && n < 100 ? Math.round((n / 100) * CONTENT_WIDTH) : null;
  }
  const px = /^\s*([\d.]+)px\s*$/.exec(width);
  if (px) return Number(px[1]) > 0 ? Math.round(Number(px[1])) : null;
  return null;
}

export function offprintContentToBlocks(
  items: OffprintBlock[],
  opts: {
    parent: string;
    blobUrl: (cid: string) => string;
    resolved: OffprintResolved;
  },
): ConvertedContent {
  const builder = contentBuilder(opts.parent);
  const { card } = builder;
  const blobSource = (blob: OffprintBlob | undefined) => {
    const cid = blobCid(blob);
    if (!cid) throw new Error("Image block without a blob");
    return opts.blobUrl(cid);
  };
  const gallery = (
    format: "grid" | "carousel",
    images: OffprintGridImage[],
    caption?: string,
  ) => {
    builder.gallery(
      format,
      images.map((img) => ({
        url: blobSource(img.image ?? img.blob),
        width: img.aspectRatio?.width ?? null,
        height: img.aspectRatio?.height ?? null,
        alt: img.alt,
      })),
    );
    builder.html(captionHtml(caption));
  };
  const linkCard = (b: {
    href: string;
    title?: string;
    description?: string;
    preview?: OffprintBlob;
  }) => {
    const entityID = card({
      type: "link",
      facts: [
        string("link/url", b.href),
        ...(b.title ? [string("link/title", b.title)] : []),
        ...(b.description ? [string("link/description", b.description)] : []),
      ],
    });
    if (b.preview)
      builder.image({
        entityID,
        url: blobSource(b.preview),
        width: null,
        height: null,
        attribute: "link/preview",
      });
  };

  const convert = (item: OffprintBlock, inComponent: boolean) => {
    switch (item.$type) {
      case "app.offprint.block.text":
        builder.html(textHtml(item as OffprintTextBlock));
        break;
      case "app.offprint.block.heading":
        builder.html(headingHtml(item as OffprintHeadingBlock));
        break;
      case "app.offprint.block.blockquote": {
        const quote = item as Extract<OffprintBlock, { content: unknown }>;
        for (const inner of quote.content) {
          const paragraphs = facetsToParagraphs(inner.plaintext, inner.facets);
          const wrap = (p: string) =>
            inner.$type === "app.offprint.block.heading"
              ? `<strong>${p}</strong>`
              : p;
          builder.html(
            paragraphs
              .map((p) => `<blockquote>${wrap(p)}</blockquote>`)
              .join(""),
          );
        }
        break;
      }
      case "app.offprint.block.callout": {
        const callout = item as Extract<OffprintBlock, { emoji?: string }>;
        const inner = facetsToParagraphs(
          callout.plaintext,
          callout.facets,
        ).join("<br>");
        if (inner)
          builder.html(
            `<blockquote>${escapeHtml(callout.emoji ?? "💡")} ${inner}</blockquote>`,
          );
        break;
      }
      case "app.offprint.block.bulletList":
      case "app.offprint.block.taskList":
        builder.html(
          listHtml("ul", (item as { children: OffprintListItem[] }).children),
        );
        break;
      case "app.offprint.block.orderedList":
        builder.html(
          listHtml("ol", (item as { children: OffprintListItem[] }).children),
        );
        break;
      case "app.offprint.block.codeBlock": {
        const code = item as Extract<OffprintBlock, { code: string }>;
        builder.html(
          `<pre data-lang="${escapeHtml(code.language || "plaintext")}">${escapeHtml(code.code)}</pre>`,
        );
        break;
      }
      case "app.offprint.block.mathBlock":
        builder.html(
          `<div data-tex="${escapeHtml((item as { tex: string }).tex)}"></div>`,
        );
        break;
      case "app.offprint.block.horizontalRule":
        builder.html("<hr>");
        break;
      case "app.offprint.block.image": {
        const img = item as Extract<OffprintBlock, { captionFacets?: unknown }>;
        const width = cssWidthToPx(img.width);
        const entityID = card({
          type: "image",
          facts: [
            ...(img.alt ? [string("image/alt", img.alt)] : []),
            ...(width ? [number("image/max-width", width)] : []),
            ...(width && img.alignment
              ? [
                  {
                    attribute: "block/text-alignment",
                    data: {
                      type: "text-alignment-type-union",
                      value: img.alignment,
                    },
                  },
                ]
              : []),
          ],
        });
        builder.image({
          entityID,
          url: blobSource(img.image),
          width: img.aspectRatio?.width ?? null,
          height: img.aspectRatio?.height ?? null,
        });
        builder.html(captionHtml(img.caption, img.captionFacets));
        break;
      }
      case "app.offprint.block.imageGrid":
      case "app.offprint.block.imageDiff":
        gallery(
          "grid",
          (item as { images: OffprintGridImage[] }).images,
          (item as { caption?: string }).caption,
        );
        break;
      case "app.offprint.block.imageCarousel":
        gallery(
          "carousel",
          (item as { images: OffprintGridImage[] }).images,
          (item as { caption?: string }).caption,
        );
        break;
      case "app.offprint.block.webBookmark":
        linkCard(
          item as Extract<OffprintBlock, { href: string; title: string }>,
        );
        break;
      case "app.offprint.block.webEmbed": {
        const embed = item as Extract<OffprintBlock, { embedUrl?: string }>;
        if (embed.embedUrl)
          card({
            type: "embed",
            facts: [
              string("embed/url", embed.embedUrl),
              ...(embed.embedHeight
                ? [number("embed/height", embed.embedHeight)]
                : []),
            ],
          });
        else linkCard(embed);
        break;
      }
      case "app.offprint.block.button": {
        const button = item as Extract<
          OffprintBlock,
          { text: string; href: string }
        >;
        builder.html(captionHtml(button.caption));
        card({
          type: "button",
          facts: [
            string("button/text", button.text || button.href),
            string("button/url", button.href),
          ],
        });
        break;
      }
      case "app.offprint.block.blueskyPost": {
        const uri = (item as { post: { uri: string } }).post.uri;
        const thread = opts.resolved.blueskyThreads.get(uri);
        if (!thread)
          throw new Error(`Bluesky post ${uri} could not be fetched`);
        card({
          type: "bluesky-post",
          facts: [
            {
              attribute: "block/bluesky-post",
              data: { type: "bluesky-post", value: thread },
            },
            string("bluesky-post/host", "bsky.app"),
          ],
        });
        break;
      }
      case "app.offprint.block.component": {
        const uri = (item as { component: string }).component;
        if (inComponent)
          throw new Error(`Component ${uri} nests another component`);
        const items = opts.resolved.components.get(uri);
        if (!items) throw new Error(`Component ${uri} could not be fetched`);
        for (const inner of items) convert(inner, true);
        break;
      }
      default:
        throw new Error(`Unsupported Offprint block "${item.$type}"`);
    }
  };

  for (const item of items) convert(item, false);
  return builder.finish();
}
