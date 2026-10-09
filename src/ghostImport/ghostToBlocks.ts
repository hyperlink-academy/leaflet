import { JSDOM } from "jsdom";
import {
  contentBuilder,
  escapeHtml,
  stringFact as string,
  type Card as BlockCard,
  type ConvertedContent,
  type ImportImage,
} from "src/import/content";
import { resolveGhostUrl } from "./parseGhostExport";

type Card = BlockCard & { image?: Omit<ImportImage, "entityID"> };
type Segment = { kind: "html"; html: string } | ({ kind: "card" } & Card);

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const COMMENT_NODE = 8;

const size = (v: string | null): number | null => {
  const n = Number(v);
  return n > 0 ? n : null;
};
function need(el: Element, selector: string): Element {
  const found = el.querySelector(selector);
  if (!found) throw new Error(`Ghost card has no <${selector}>`);
  return found;
}
function imageCard(img: Element): Card {
  const url = img.getAttribute("src");
  if (!url) throw new Error("Image without a src");
  const alt = img.getAttribute("alt");
  return {
    type: "image",
    facts: alt ? [string("image/alt", alt)] : [],
    image: {
      url,
      width: size(img.getAttribute("width")),
      height: size(img.getAttribute("height")),
    },
  };
}

function embedCard(iframe: Element): Card {
  const url = iframe.getAttribute("src");
  if (!url) throw new Error("iframe without a src");
  const height = size(iframe.getAttribute("height"));
  return {
    type: "embed",
    facts: [
      string("embed/url", url),
      ...(height
        ? [
            {
              attribute: "embed/height",
              data: { type: "number", value: height },
            },
          ]
        : []),
    ],
  };
}

// An html card holding just an iframe is an embed; anything else is kept as
// raw html.
function htmlCard(container: Element): Card {
  const only =
    container.children.length === 1 ? container.firstElementChild : null;
  if (only?.tagName === "IFRAME") return embedCard(only);
  return {
    type: "html",
    facts: [string("embed/html", container.innerHTML.trim())],
  };
}

const CARD_CLASS = /^kg-(.+)-card$/;

// Ghost "koenig" cards that map onto Leaflet blocks. Anything else tagged as a
// card is refused rather than imported as something it isn't.
function convertCard(el: Element): Segment[] {
  const kind = Array.from(el.classList)
    .map((c) => CARD_CLASS.exec(c)?.[1])
    .find(Boolean);
  const cards: Segment[] = [];
  const card = (c: Card) => cards.push({ kind: "card", ...c });
  switch (kind) {
    case "image":
      card(imageCard(need(el, "img")));
      break;
    case "gallery":
      Array.from(el.querySelectorAll("img")).map(imageCard).forEach(card);
      break;
    case "embed":
      card(embedCard(need(el, "iframe")));
      break;
    case "bookmark": {
      const url = need(el, "a[href]").getAttribute("href")!;
      const title = el.querySelector(".kg-bookmark-title")?.textContent?.trim();
      const description = el
        .querySelector(".kg-bookmark-description")
        ?.textContent?.trim();
      card({
        type: "link",
        facts: [
          string("link/url", url),
          ...(title ? [string("link/title", title)] : []),
          ...(description ? [string("link/description", description)] : []),
        ],
      });
      break;
    }
    case "button": {
      const a = need(el, "a[href]");
      const url = a.getAttribute("href")!;
      card({
        type: "button",
        facts: [
          string("button/text", a.textContent?.trim() || url),
          string("button/url", url),
        ],
      });
      break;
    }
    case "callout": {
      const emoji = el.querySelector(".kg-callout-emoji")?.textContent?.trim();
      const text = need(el, ".kg-callout-text").innerHTML;
      cards.push({
        kind: "html",
        html: `<blockquote>${emoji ? emoji + " " : ""}${text}</blockquote>`,
      });
      break;
    }
    case "signup":
      card({ type: "signup", facts: [] });
      break;
    default:
      throw new Error(`Unsupported Ghost card "${kind ?? el.className}"`);
  }
  const caption = el.querySelector("figcaption")?.innerHTML.trim();
  if (caption)
    cards.push({
      kind: "html",
      html: `<p data-text-size="small">${caption}</p>`,
    });
  return cards;
}

// Split a Ghost post body into runs of ordinary HTML that the paste pipeline
// understands, interleaved with cards that map to a specific Leaflet block.
function segmentGhostBody(body: HTMLElement, doc: Document): Segment[] {
  const segments: Segment[] = [];
  const push = (s: Segment) => {
    const last = segments[segments.length - 1];
    if (s.kind === "html" && last?.kind === "html") last.html += s.html;
    else segments.push(s);
  };

  const nodes = Array.from(body.childNodes);
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.nodeType === COMMENT_NODE) {
      const text = node.textContent?.trim();
      // Ghost's members-only paywall card renders as a bare comment.
      if (text === "members-only")
        push({ kind: "card", type: "members-only-delimiter", facts: [] });
      else if (text === "kg-card-begin: html") {
        const container = doc.createElement("div");
        while (
          ++i < nodes.length &&
          !(
            nodes[i].nodeType === COMMENT_NODE &&
            nodes[i].textContent?.trim() === "kg-card-end: html"
          )
        )
          container.appendChild(nodes[i].cloneNode(true));
        push({ kind: "card", ...htmlCard(container) });
      }
    } else if (node.nodeType === TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text.trim())
        push({ kind: "html", html: `<p>${escapeHtml(text)}</p>` });
    } else if (node.nodeType === ELEMENT_NODE) {
      const el = node as Element;
      if (el.tagName === "IFRAME") push({ kind: "card", ...embedCard(el) });
      else if (el.tagName === "IMG") push({ kind: "card", ...imageCard(el) });
      else if (el.classList.contains("kg-card")) convertCard(el).forEach(push);
      else push({ kind: "html", html: el.outerHTML });
    }
  }
  return segments;
}

export function ghostHtmlToBlocks(
  html: string,
  opts: { siteUrl: string; parent: string },
): ConvertedContent {
  const dom = new JSDOM(`<body>${resolveGhostUrl(html, opts.siteUrl)}</body>`);
  const doc = dom.window.document;
  // Ghost leaves stray empty paragraphs behind, and keeps responsive variants
  // in srcset that the paste parser would otherwise pick up.
  for (const p of Array.from(doc.querySelectorAll("p")))
    if (!p.textContent?.trim() && p.children.length === 0) p.remove();
  for (const img of Array.from(doc.querySelectorAll("img"))) {
    img.removeAttribute("srcset");
    img.removeAttribute("sizes");
    // The paste pipeline only keeps images that stand as blocks of their own;
    // Ghost's markdown cards render each `![]()` inside a paragraph.
    const p = img.parentElement;
    if (p?.tagName !== "P") continue;
    if (p.textContent?.trim() || p.children.length !== 1)
      throw new Error(`Inline image ${img.getAttribute("src")} in a paragraph`);
    p.replaceWith(img);
  }

  const builder = contentBuilder(opts.parent);
  for (const seg of segmentGhostBody(doc.body, doc)) {
    if (seg.kind === "html") builder.html(seg.html);
    else {
      const entityID = builder.card(seg);
      if (seg.image) builder.image({ entityID, ...seg.image });
    }
  }
  return builder.finish();
}
