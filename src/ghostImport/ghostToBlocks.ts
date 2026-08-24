import { JSDOM } from "jsdom";
import { v7 } from "uuid";
import { buildBlocksFromPasteHTML } from "src/utils/paste/htmlToBlocks";
import type { BuiltBlock } from "src/utils/paste/htmlToBlocks";
import type { FactInput } from "src/replicache/mutations";
import { resolveGhostUrl } from "./parseGhostExport";

export type ImportWarning = { kind: string; detail: string };

export type ImportImage = {
  entityID: string;
  url: string;
  alt: string | null;
  // Ghost's rendered <img> carries the intrinsic size, which lets a preview
  // reserve the right aspect ratio before the bytes are fetched.
  width: number | null;
  height: number | null;
};

export type ConvertedContent = {
  blocks: BuiltBlock[];
  extraEntities: string[];
  images: ImportImage[];
  warnings: ImportWarning[];
};

// The paste pipeline (src/utils/paste) is written against browser globals.
// Node has none, so they're installed from a jsdom window for the duration of
// a synchronous conversion and removed again — leaving `document` defined on
// the server would trip libraries that use it to detect a browser.
let sharedDom: JSDOM | undefined;
function withDomGlobals<T>(fn: () => T): T {
  const g = globalThis as Record<string, unknown>;
  if (typeof g.document !== "undefined") return fn();
  sharedDom ??= new JSDOM("");
  const w = sharedDom.window as unknown as Record<string, unknown>;
  const names = ["DOMParser", "document", "Node", "HTMLElement", "Element"];
  for (const n of names) g[n] = w[n];
  try {
    return fn();
  } finally {
    for (const n of names) delete g[n];
  }
}

type Segment =
  | { kind: "html"; html: string }
  | {
      kind: "image";
      url: string;
      alt: string | null;
      width: number | null;
      height: number | null;
      caption: string | null;
    }
  | { kind: "embed"; url: string; height: number | null }
  | {
      kind: "link";
      url: string;
      title: string | null;
      description: string | null;
    }
  | { kind: "button"; text: string; url: string }
  | { kind: "rawHtml"; html: string }
  | { kind: "delimiter" }
  | { kind: "signup" };

const num = (v: string | null): number | null => {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Ghost's members-only paywall card renders as this comment in the HTML.
const PAYWALL_COMMENT = "members-only";
const HTML_CARD_BEGIN = /^\s*kg-card-begin:\s*html\s*$/;
const HTML_CARD_END = /^\s*kg-card-end:\s*html\s*$/;

// Split a Ghost post body into segments: runs of ordinary HTML that the paste
// pipeline understands, interleaved with Ghost "koenig" cards that map to a
// specific Leaflet block.
function segmentGhostBody(
  body: HTMLElement,
  doc: Document,
  warnings: ImportWarning[],
): Segment[] {
  const segments: Segment[] = [];
  let htmlBuffer: string[] = [];
  const flush = () => {
    if (htmlBuffer.length === 0) return;
    segments.push({ kind: "html", html: htmlBuffer.join("") });
    htmlBuffer = [];
  };
  const push = (s: Segment) => {
    flush();
    segments.push(s);
  };

  const imageFromFigure = (figure: Element) => {
    const img = figure.querySelector("img");
    if (!img) return false;
    const url = img.getAttribute("src");
    if (!url) return false;
    const captionEl = figure.querySelector("figcaption");
    push({
      kind: "image",
      url,
      alt: img.getAttribute("alt") || null,
      width: num(img.getAttribute("width")),
      height: num(img.getAttribute("height")),
      caption: captionEl?.innerHTML.trim() || null,
    });
    return true;
  };

  const nodes = Array.from(body.childNodes);
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (node.nodeType === 8) {
      const text = node.textContent ?? "";
      if (text.trim() === PAYWALL_COMMENT) {
        push({ kind: "delimiter" });
        continue;
      }
      if (HTML_CARD_BEGIN.test(text)) {
        // Collect everything up to the matching end comment as one html card.
        const parts: Node[] = [];
        let j = i + 1;
        for (; j < nodes.length; j++) {
          const n = nodes[j];
          if (n.nodeType === 8 && HTML_CARD_END.test(n.textContent ?? ""))
            break;
          parts.push(n);
        }
        i = j;
        const container = doc.createElement("div");
        for (const p of parts) container.appendChild(p.cloneNode(true));
        const html = container.innerHTML.trim();
        if (!html) continue;
        const only =
          container.children.length === 1 ? container.firstElementChild : null;
        if (only?.tagName === "IFRAME" && only.getAttribute("src")) {
          push({
            kind: "embed",
            url: only.getAttribute("src")!,
            height: num(only.getAttribute("height")),
          });
        } else {
          push({ kind: "rawHtml", html });
        }
        continue;
      }
      continue;
    }

    if (node.nodeType === 3) {
      if ((node.textContent ?? "").trim())
        htmlBuffer.push(`<p>${escapeHtml(node.textContent!)}</p>`);
      continue;
    }
    if (node.nodeType !== 1) continue;
    const el = node as HTMLElement;
    const cls = el.classList;

    if (el.tagName === "IFRAME") {
      const src = el.getAttribute("src");
      if (src)
        push({
          kind: "embed",
          url: src,
          height: num(el.getAttribute("height")),
        });
      continue;
    }

    if (cls.contains("kg-card") || el.tagName === "FIGURE") {
      if (cls.contains("kg-gallery-card")) {
        for (const img of Array.from(el.querySelectorAll("img"))) {
          const url = img.getAttribute("src");
          if (url)
            push({
              kind: "image",
              url,
              alt: img.getAttribute("alt") || null,
              width: num(img.getAttribute("width")),
              height: num(img.getAttribute("height")),
              caption: null,
            });
        }
        const captionEl = el.querySelector("figcaption");
        if (captionEl?.innerHTML.trim())
          htmlBuffer.push(
            `<p data-text-size="small">${captionEl.innerHTML}</p>`,
          );
        continue;
      }
      if (
        cls.contains("kg-image-card") ||
        (el.tagName === "FIGURE" && !el.querySelector("iframe, video, audio"))
      ) {
        if (imageFromFigure(el)) continue;
      }
      if (cls.contains("kg-embed-card") || el.querySelector("iframe")) {
        const iframe = el.querySelector("iframe");
        const src = iframe?.getAttribute("src");
        if (src) {
          push({
            kind: "embed",
            url: src,
            height: num(iframe!.getAttribute("height")),
          });
        } else {
          // Twitter/X embeds are blockquotes with a link; others we can only
          // keep as a link.
          const a = el.querySelector("a[href]");
          if (a) {
            push({
              kind: "link",
              url: a.getAttribute("href")!,
              title: a.textContent?.trim() || null,
              description: null,
            });
          } else {
            warnings.push({
              kind: "dropped_embed",
              detail: "Embed card with no iframe or link was dropped",
            });
          }
        }
        const captionEl = el.querySelector("figcaption");
        if (captionEl?.innerHTML.trim())
          htmlBuffer.push(
            `<p data-text-size="small">${captionEl.innerHTML}</p>`,
          );
        continue;
      }
      if (cls.contains("kg-bookmark-card")) {
        const a = el.querySelector("a.kg-bookmark-container[href], a[href]");
        if (a) {
          push({
            kind: "link",
            url: a.getAttribute("href")!,
            title:
              el.querySelector(".kg-bookmark-title")?.textContent?.trim() ||
              null,
            description:
              el
                .querySelector(".kg-bookmark-description")
                ?.textContent?.trim() || null,
          });
        }
        const captionEl = el.querySelector("figcaption");
        if (captionEl?.innerHTML.trim())
          htmlBuffer.push(
            `<p data-text-size="small">${captionEl.innerHTML}</p>`,
          );
        continue;
      }
      if (cls.contains("kg-button-card")) {
        const a = el.querySelector("a[href]");
        if (a)
          push({
            kind: "button",
            text: a.textContent?.trim() || a.getAttribute("href")!,
            url: a.getAttribute("href")!,
          });
        continue;
      }
      if (cls.contains("kg-callout-card")) {
        const emoji = el
          .querySelector(".kg-callout-emoji")
          ?.textContent?.trim();
        const text =
          el.querySelector(".kg-callout-text")?.innerHTML ?? el.innerHTML;
        htmlBuffer.push(
          `<blockquote>${emoji ? emoji + " " : ""}${text}</blockquote>`,
        );
        continue;
      }
      if (cls.contains("kg-toggle-card")) {
        const heading = el.querySelector(".kg-toggle-heading-text")?.innerHTML;
        const content = el.querySelector(".kg-toggle-content")?.innerHTML;
        if (heading) htmlBuffer.push(`<h3>${heading}</h3>`);
        if (content) htmlBuffer.push(content);
        continue;
      }
      if (cls.contains("kg-header-card")) {
        for (const child of Array.from(el.querySelectorAll("h1, h2, h3, p"))) {
          htmlBuffer.push(child.outerHTML);
        }
        continue;
      }
      if (cls.contains("kg-signup-card")) {
        push({ kind: "signup" });
        continue;
      }
      if (cls.contains("kg-product-card")) {
        const img = el.querySelector("img");
        if (img?.getAttribute("src"))
          push({
            kind: "image",
            url: img.getAttribute("src")!,
            alt: img.getAttribute("alt") || null,
            width: num(img.getAttribute("width")),
            height: num(img.getAttribute("height")),
            caption: null,
          });
        const title = el.querySelector(".kg-product-card-title")?.innerHTML;
        const description = el.querySelector(
          ".kg-product-card-description",
        )?.innerHTML;
        if (title) htmlBuffer.push(`<h3>${title}</h3>`);
        if (description) htmlBuffer.push(`<p>${description}</p>`);
        const a = el.querySelector("a.kg-product-card-button[href], a[href]");
        if (a)
          push({
            kind: "button",
            text: a.textContent?.trim() || "Buy",
            url: a.getAttribute("href")!,
          });
        continue;
      }
      if (
        cls.contains("kg-video-card") ||
        cls.contains("kg-audio-card") ||
        cls.contains("kg-file-card")
      ) {
        const media = el.querySelector("video, audio, source, a[href]");
        const src = media?.getAttribute("src") || media?.getAttribute("href");
        const label = cls.contains("kg-video-card")
          ? "Video"
          : cls.contains("kg-audio-card")
            ? "Audio"
            : "File";
        if (src) {
          push({
            kind: "link",
            url: src,
            title:
              el
                .querySelector(".kg-file-card-title, .kg-audio-title")
                ?.textContent?.trim() || `${label}: ${src.split("/").pop()}`,
            description: null,
          });
          warnings.push({
            kind: "media_linked",
            detail: `${label} card kept as a link (media files aren't imported): ${src}`,
          });
        } else {
          warnings.push({
            kind: "dropped_media",
            detail: `${label} card without a source was dropped`,
          });
        }
        continue;
      }
      const cardClass = Array.from(cls).find(
        (c) => c.startsWith("kg-") && c.endsWith("-card"),
      );
      if (cardClass) {
        warnings.push({
          kind: "unknown_card",
          detail: `Unrecognised Ghost card "${cardClass}" imported as plain content`,
        });
      }
    }

    htmlBuffer.push(el.outerHTML);
  }
  flush();
  return segments;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Ghost keeps responsive variants in srcset; only the original src matters,
// and dropping the rest keeps the paste parser from seeing them.
function stripResponsiveAttrs(root: Element) {
  for (const img of Array.from(root.querySelectorAll("img"))) {
    img.removeAttribute("srcset");
    img.removeAttribute("sizes");
    img.removeAttribute("loading");
  }
}

function isEmptyTextBlock(b: BuiltBlock): boolean {
  if (b.type !== "text") return false;
  if (b.facts.some((f) => f.attribute === "block/footnote")) return false;
  return !b.parsedContent || b.parsedContent.textContent.trim() === "";
}

export function ghostHtmlToBlocks(
  html: string,
  opts: { siteUrl: string; parent: string; permission_set: string },
): ConvertedContent {
  const resolved = resolveGhostUrl(html, opts.siteUrl) ?? "";
  const warnings: ImportWarning[] = [];
  const dom = new JSDOM(`<body>${resolved}</body>`);
  const doc = dom.window.document;
  stripResponsiveAttrs(doc.body);
  const segments = segmentGhostBody(doc.body, doc, warnings);

  const blocks: BuiltBlock[] = [];
  const extraEntities: string[] = [];
  const images: ImportImage[] = [];

  const custom = (type: BuiltBlock["type"], facts: FactInput[]): BuiltBlock => {
    const entityID = v7();
    return {
      entityID,
      parent: opts.parent,
      type,
      facts: [
        {
          entity: entityID,
          attribute: "block/type",
          data: { type: "block-type-union", value: type },
        },
        ...facts.map((f) => ({ ...f, entity: entityID }) as FactInput),
      ],
    };
  };

  for (const seg of segments) {
    switch (seg.kind) {
      case "html": {
        const result = withDomGlobals(() =>
          buildBlocksFromPasteHTML(seg.html, {
            parent: opts.parent,
            permission_set: opts.permission_set,
          }),
        );
        // Ghost leaves stray empty paragraphs behind; they'd become empty
        // blocks that the editor then shows as blank lines.
        const dropped = new Set(
          result.blocks.filter(isEmptyTextBlock).map((b) => b.entityID),
        );
        for (const b of result.blocks) {
          if (dropped.has(b.entityID)) continue;
          b.facts = b.facts.filter(
            (f) =>
              !(
                f.attribute === "card/block" &&
                dropped.has((f.data as { value: string }).value)
              ),
          );
          blocks.push(b);
        }
        extraEntities.push(...result.extraEntities.map((e) => e.entityID));
        for (const task of result.imageTasks) {
          images.push({
            entityID: task.entityID,
            url: task.url,
            alt: null,
            width: null,
            height: null,
          });
        }
        break;
      }
      case "image": {
        const b = custom(
          "image",
          seg.alt
            ? [
                {
                  entity: "",
                  attribute: "image/alt",
                  data: { type: "string", value: seg.alt },
                },
              ]
            : [],
        );
        blocks.push(b);
        images.push({
          entityID: b.entityID,
          url: seg.url,
          alt: seg.alt,
          width: seg.width,
          height: seg.height,
        });
        if (seg.caption) {
          const captionResult = withDomGlobals(() =>
            buildBlocksFromPasteHTML(
              `<p data-text-size="small">${seg.caption}</p>`,
              { parent: opts.parent, permission_set: opts.permission_set },
            ),
          );
          blocks.push(
            ...captionResult.blocks.filter((b) => !isEmptyTextBlock(b)),
          );
        }
        break;
      }
      case "embed":
        blocks.push(
          custom("embed", [
            {
              entity: "",
              attribute: "embed/url",
              data: { type: "string", value: seg.url },
            },
            ...(seg.height
              ? [
                  {
                    entity: "",
                    attribute: "embed/height",
                    data: { type: "number", value: seg.height },
                  } as FactInput,
                ]
              : []),
          ]),
        );
        break;
      case "link":
        blocks.push(
          custom("link", [
            {
              entity: "",
              attribute: "link/url",
              data: { type: "string", value: seg.url },
            },
            ...(seg.title
              ? [
                  {
                    entity: "",
                    attribute: "link/title",
                    data: { type: "string", value: seg.title },
                  } as FactInput,
                ]
              : []),
            ...(seg.description
              ? [
                  {
                    entity: "",
                    attribute: "link/description",
                    data: { type: "string", value: seg.description },
                  } as FactInput,
                ]
              : []),
          ]),
        );
        break;
      case "button":
        blocks.push(
          custom("button", [
            {
              entity: "",
              attribute: "button/text",
              data: { type: "string", value: seg.text },
            },
            {
              entity: "",
              attribute: "button/url",
              data: { type: "string", value: seg.url },
            },
          ]),
        );
        break;
      case "rawHtml":
        blocks.push(
          custom("html", [
            {
              entity: "",
              attribute: "embed/html",
              data: { type: "string", value: seg.html },
            },
          ]),
        );
        warnings.push({
          kind: "raw_html",
          detail:
            "An HTML card was imported as a raw HTML block; check it renders as intended",
        });
        break;
      case "delimiter":
        blocks.push(custom("members-only-delimiter", []));
        break;
      case "signup":
        blocks.push(custom("signup", []));
        break;
    }
  }

  return { blocks, extraEntities, images, warnings };
}
